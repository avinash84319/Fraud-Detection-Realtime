# Fraud Detection Realtime 🚨

Real-time fraud detection system with 3 UIs, FastAPI backend, WebSockets, RandomForest ML model, SHAP explainability, and optional LLM interpretation.

## Architecture

```
Transactor UI  →  POST /api/transaction
                        ↓
              FastAPI (SQLite + asyncio.Queue)
                        ↓
              Feature Engineering Worker
                        ↓
              RF Model → SHAP → LLM (Groq)
                        ↓
              WebSocket broadcast → Admin & Banker UIs
```

## Quick Start

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Or just run: `bash start-backend.sh`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Or just run: `bash start-frontend.sh`

### 3. Open Browser
- **Transactor UI**: http://localhost:5173/transactor
- **Admin UI**: http://localhost:5173/admin
- **Banker UI**: http://localhost:5173/banker
- **API Docs**: http://localhost:8000/docs

## Optional: LLM Explanations via Groq (Free)

Get a free API key at https://console.groq.com
```bash
export GROQ_API_KEY=your_key_here
```
Without it, template-based explanations are used automatically.

## Three UIs

### 🏧 Transactor UI (`/transactor`)
- 20 pre-built sample transactions (mix of normal + suspicious)
- Click "Send Transaction" on any card
- "Send Random" button for quick demo
- Recently sent sidebar

### ⚙️ Admin UI (`/admin`)
- Real-time 4-step pipeline tracker per transaction:
  1. 📥 Submitted
  2. 🗄️ In Database
  3. ⚙️ Feature Engineering
  4. 🤖 Model Response
- Steps light up live via WebSocket
- Shows SHAP feature importance + LLM explanation when complete

### 🏦 Banker/Analyst UI (`/banker`)
- Split-panel: transaction list (left) + detail (right)
- Full SHAP explanation chart
- LLM analysis in natural language
- "Notify Customer" button with pre-filled, editable message

## Tech Stack
- **Backend**: FastAPI, SQLite (aiosqlite), asyncio.Queue, WebSockets
- **ML**: scikit-learn RandomForestClassifier, SHAP TreeExplainer
- **LLM**: Groq (llama3-8b-8192) with template fallback
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **No Kafka** — uses in-process async queue for simplicity
