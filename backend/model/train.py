"""
Train a RandomForestClassifier on synthetic fraud data and save to model/model.pkl.
Run this script directly: python model/train.py
"""
import json
import os
import sys

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Ensure we can import from the backend root when run directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "feature_names.json")

FEATURE_NAMES = [
    "amount",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "is_foreign",
    "category_encoded",
    "merchant_risk_score",
    "amount_log",
]


def generate_synthetic_data(n: int = 5000):
    rng = np.random.default_rng(42)

    # Normal transactions (80%)
    n_normal = int(n * 0.80)
    n_fraud = n - n_normal

    normal = {
        "amount": rng.exponential(scale=80, size=n_normal).clip(1, 800),
        "hour_of_day": rng.integers(7, 22, size=n_normal),
        "day_of_week": rng.integers(0, 7, size=n_normal),
        "is_weekend": rng.integers(0, 2, size=n_normal),
        "is_foreign": rng.choice([0, 1], size=n_normal, p=[0.95, 0.05]),
        "category_encoded": rng.integers(0, 10, size=n_normal),
        "merchant_risk_score": rng.uniform(0.0, 0.3, size=n_normal),
    }

    # Fraudulent transactions (20%) — higher amounts, odd hours, foreign, high-risk categories
    fraud = {
        "amount": rng.exponential(scale=2000, size=n_fraud).clip(200, 15000),
        "hour_of_day": rng.choice(
            list(range(0, 6)) + list(range(22, 24)), size=n_fraud
        ),
        "day_of_week": rng.integers(0, 7, size=n_fraud),
        "is_weekend": rng.integers(0, 2, size=n_fraud),
        "is_foreign": rng.choice([0, 1], size=n_fraud, p=[0.3, 0.7]),
        "category_encoded": rng.integers(5, 10, size=n_fraud),
        "merchant_risk_score": rng.uniform(0.5, 1.0, size=n_fraud),
    }

    def to_X(d):
        rows = []
        for i in range(len(d["amount"])):
            amt = d["amount"][i]
            rows.append([
                amt,
                d["hour_of_day"][i],
                d["day_of_week"][i],
                d["is_weekend"][i],
                d["is_foreign"][i],
                d["category_encoded"][i],
                d["merchant_risk_score"][i],
                float(np.log1p(amt)),
            ])
        return rows

    X_normal = to_X(normal)
    X_fraud = to_X(fraud)

    X = np.array(X_normal + X_fraud, dtype=float)
    y = np.array([0] * n_normal + [1] * n_fraud, dtype=int)

    # Shuffle
    idx = rng.permutation(len(y))
    return X[idx], y[idx]


def train():
    print("Generating synthetic data…")
    X, y = generate_synthetic_data(5000)

    print(f"Training RandomForestClassifier on {len(X)} samples (fraud rate: {y.mean():.1%})…")
    clf = RandomForestClassifier(
        n_estimators=100,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X, y)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    with open(FEATURE_NAMES_PATH, "w") as f:
        json.dump(FEATURE_NAMES, f)
    print(f"Feature names saved to {FEATURE_NAMES_PATH}")


if __name__ == "__main__":
    train()
