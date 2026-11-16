"""
FastAPI main application for the real-time fraud detection system.
"""
import asyncio
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database
from pipeline import pipeline
from sample_transactions import SAMPLE_TRANSACTIONS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info("WebSocket connected. Total clients: %d", len(self.active))

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info("WebSocket disconnected. Total clients: %d", len(self.active))

    async def broadcast(self, message: dict):
        payload = json.dumps(message)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()

# ---------------------------------------------------------------------------
# Processing queue + background worker
# ---------------------------------------------------------------------------

tx_queue: asyncio.Queue = asyncio.Queue()


async def broadcast_event(event: str, tx_id: str, data: dict):
    await manager.broadcast({"event": event, "tx_id": tx_id, "data": data})


async def queue_worker():
    logger.info("Queue worker started.")
    while True:
        try:
            tx = await tx_queue.get()
            logger.info("Processing transaction %s", tx.get("id"))
            await pipeline.process_transaction(tx, broadcast_event)
            tx_queue.task_done()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("Worker error: %s", exc, exc_info=True)


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure model exists
    model_path = os.path.join(os.path.dirname(__file__), "model", "model.pkl")
    if not os.path.exists(model_path):
        logger.info("model.pkl not found — training now…")
        await asyncio.to_thread(_train_model)

    await database.init_db()
    worker_task = asyncio.create_task(queue_worker())
    logger.info("Application started.")
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("Application shut down.")


def _train_model():
    import subprocess
    train_script = os.path.join(os.path.dirname(__file__), "model", "train.py")
    subprocess.run([sys.executable, train_script], check=True)


app = FastAPI(title="Fraud Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class NotifyRequest(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/sample-transactions")
async def get_sample_transactions():
    return SAMPLE_TRANSACTIONS


@app.post("/api/transaction")
async def submit_transaction(tx: dict):
    try:
        await database.insert_transaction(tx)
        await manager.broadcast({"event": "tx_submitted", "tx_id": tx.get("id"), "data": tx})
        await tx_queue.put(tx)
        return {"tx_id": tx.get("id"), "status": "submitted"}
    except Exception as exc:
        logger.error("Failed to submit transaction: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/transactions")
async def get_transactions():
    try:
        return await database.get_all_transactions()
    except Exception as exc:
        logger.error("Failed to fetch transactions: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/transaction/{tx_id}")
async def get_transaction(tx_id: str):
    try:
        result = await database.get_transaction_with_result(tx_id)
        if not result:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to fetch transaction %s: %s", tx_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/transaction/{tx_id}/notify-customer")
async def notify_customer(tx_id: str, body: NotifyRequest):
    # Mock notification — in production this would call email/SMS service
    logger.info("Mock notification for tx %s: %s", tx_id, body.message)
    return {"status": "sent", "message": body.message}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Keep the connection alive; we don't expect messages from clients
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)


@app.get("/health")
async def health():
    return {"status": "ok"}
