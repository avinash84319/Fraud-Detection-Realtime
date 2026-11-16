"""
Async SQLite database layer for the fraud detection system.
"""
import json
import logging
import os
from datetime import datetime
from typing import Optional

import aiosqlite

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "fraud.db")


async def init_db():
    """Initialize the database and create tables."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                amount REAL NOT NULL,
                merchant TEXT,
                category TEXT,
                card_last4 TEXT,
                location TEXT,
                user_id TEXT,
                raw_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'submitted'
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transaction_features (
                tx_id TEXT PRIMARY KEY,
                feature_json TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transaction_results (
                tx_id TEXT PRIMARY KEY,
                is_fraud INTEGER NOT NULL,
                fraud_probability REAL NOT NULL,
                shap_json TEXT,
                lime_json TEXT,
                llm_explanation TEXT,
                created_at TEXT NOT NULL
            )
        """)
        try:
            await db.execute("ALTER TABLE transaction_results ADD COLUMN lime_json TEXT")
        except Exception:
            pass
        await db.commit()
    logger.info("Database initialized.")


async def insert_transaction(tx: dict):
    """Insert a new transaction record."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO transactions 
               (id, timestamp, amount, merchant, category, card_last4, location, user_id, raw_json, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')""",
            (
                tx.get("id"),
                tx.get("timestamp", datetime.utcnow().isoformat()),
                tx.get("amount", 0.0),
                tx.get("merchant"),
                tx.get("category"),
                tx.get("card_last4"),
                tx.get("location"),
                tx.get("user_id"),
                json.dumps(tx),
            ),
        )
        await db.commit()


async def update_tx_status(tx_id: str, status: str):
    """Update the processing status of a transaction."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE transactions SET status = ? WHERE id = ?",
            (status, tx_id),
        )
        await db.commit()


async def get_all_transactions() -> list:
    """Return all transactions joined with their results, sorted most recent first."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT t.rowid, t.*, r.is_fraud, r.fraud_probability, r.shap_json, r.lime_json, r.llm_explanation, r.created_at as result_created_at
            FROM transactions t
            LEFT JOIN transaction_results r ON t.id = r.tx_id
            ORDER BY t.rowid DESC
        """)
        rows = await cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["raw_json"] = json.loads(d["raw_json"]) if d.get("raw_json") else {}
            d["shap_json"] = json.loads(d["shap_json"]) if d.get("shap_json") else None
            d["lime_json"] = json.loads(d["lime_json"]) if d.get("lime_json") else None
            if d.get("is_fraud") is not None:
                d["result"] = {
                    "is_fraud": bool(d["is_fraud"]),
                    "fraud_probability": float(d["fraud_probability"]) if d.get("fraud_probability") is not None else 0.0,
                    "shap_values": d["shap_json"] or {},
                    "lime_values": d["lime_json"] or {},
                    "llm_explanation": d.get("llm_explanation") or "",
                }
            else:
                d["result"] = None
            result.append(d)
        return result


async def save_features(tx_id: str, features: dict):
    """Save computed features for a transaction."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO transaction_features (tx_id, feature_json) VALUES (?, ?)",
            (tx_id, json.dumps(features)),
        )
        await db.commit()


async def save_result(tx_id: str, is_fraud: bool, fraud_probability: float, shap_values: dict, llm_explanation: str, lime_values: dict = None):
    """Save inference results for a transaction."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR REPLACE INTO transaction_results
               (tx_id, is_fraud, fraud_probability, shap_json, lime_json, llm_explanation, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                tx_id,
                int(is_fraud),
                fraud_probability,
                json.dumps(shap_values or {}),
                json.dumps(lime_values or {}),
                llm_explanation,
                datetime.utcnow().isoformat(),
            ),
        )
        await db.commit()


async def get_transaction_with_result(tx_id: str) -> Optional[dict]:
    """Return a single transaction with its features and results."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT t.rowid, t.*, 
                   f.feature_json,
                   r.is_fraud, r.fraud_probability, r.shap_json, r.lime_json, r.llm_explanation, r.created_at as result_created_at
            FROM transactions t
            LEFT JOIN transaction_features f ON t.id = f.tx_id
            LEFT JOIN transaction_results r ON t.id = r.tx_id
            WHERE t.id = ?
        """, (tx_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["raw_json"] = json.loads(d["raw_json"]) if d.get("raw_json") else {}
        d["feature_json"] = json.loads(d["feature_json"]) if d.get("feature_json") else None
        d["shap_json"] = json.loads(d["shap_json"]) if d.get("shap_json") else None
        d["lime_json"] = json.loads(d["lime_json"]) if d.get("lime_json") else None
        if d.get("is_fraud") is not None:
            d["result"] = {
                "is_fraud": bool(d["is_fraud"]),
                "fraud_probability": float(d["fraud_probability"]) if d.get("fraud_probability") is not None else 0.0,
                "shap_values": d["shap_json"] or {},
                "lime_values": d["lime_json"] or {},
                "llm_explanation": d.get("llm_explanation") or "",
            }
        else:
            d["result"] = None
        return d
