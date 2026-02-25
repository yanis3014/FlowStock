from datetime import date, datetime
from typing import List

import os

import httpx
import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from importlib.metadata import version
except ImportError:
    # Python < 3.8
    from importlib_metadata import version

try:
    APP_VERSION = version("bmad-ml-service")
except Exception:
    APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

from app.database import lifespan
from app.middleware.auth import JWTPayload, get_current_user
from app.routes import chat_routes

logger = logging.getLogger("bmad.ml")


class SalesPoint(BaseModel):
    date: date
    quantity: float = Field(gt=0)


class OpenAIPredictionRequest(BaseModel):
    productId: str
    salesHistory: List[SalesPoint]
    currentStock: float = Field(ge=0)


class OpenAIPredictionResponse(BaseModel):
    predictedRuptureDate: date
    confidence: float = Field(ge=0, le=1)
    explanation: str


app = FastAPI(
    title="BMAD ML Service",
    version=APP_VERSION,
    lifespan=lifespan
)

# CORS: origines depuis CORS_ORIGINS (séparées par des virgules) ou défaut localhost
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include chat routes
app.include_router(chat_routes.router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "bmad-ml-service",
        "version": APP_VERSION,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/v1/health/ml")
async def health_ml() -> dict:
    """ML infrastructure health: model loaded yes/no, version, metrics. Epic 5.1."""
    from app.ml.inference import get_active_model, get_active_model_version
    from app.ml.metrics import get_metrics
    model = get_active_model()
    metrics = get_metrics()
    return {
        "status": "ok",
        "ml": {
            "model_loaded": model is not None,
            "version": get_active_model_version() or "none",
            "last_inference_latency_ms": metrics.get("last_inference_latency_ms"),
            "inference_count": metrics.get("inference_count", 0),
            "error_count": metrics.get("error_count", 0),
        },
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/v1/admin/model/rollback")
async def admin_rollback_model(
    version: str = "default",
    current_user: "JWTPayload" = Depends(get_current_user),
) -> dict:
    """Rollback active ML model to a given version. Epic 5.1. Requires admin JWT."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required for model rollback")
    from app.ml.registry import rollback_to_version
    ok = rollback_to_version(version)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Version not found: {version}")
    return {"status": "ok", "active_version": version}


@app.post("/api/v1/admin/retrain/trigger")
async def admin_trigger_retrain(
    current_user: "JWTPayload" = Depends(get_current_user),
) -> dict:
    """Trigger the full retrain job manually (all active tenants). Story 5.4. Requires admin JWT."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required to trigger retrain")
    from app.ml.training.retrain_job import run_retrain_job
    summary = await run_retrain_job()
    return {
        "status": "ok",
        "summary": summary.to_log_dict(),
        "results": [
            {
                "tenant_id": r.tenant_id,
                "deployed": r.deployed,
                "rollback": r.rollback,
                "duration_seconds": r.duration_seconds,
                "current_mae": r.current_mae,
                "new_mae": r.new_mae,
                "model_version": r.model_version,
                "data_points": r.data_points,
                "error": r.error,
            }
            for r in summary.results
        ],
    }


@app.post("/ml/openai/predict-stock", response_model=OpenAIPredictionResponse)
async def predict_stock(payload: OpenAIPredictionRequest) -> OpenAIPredictionResponse:
    """
    Skeleton endpoint that will call OpenAI to predict a stock-out date.

    For now, it returns a dummy prediction. Later, you will:
    - Build a prompt from `payload.salesHistory` and `payload.currentStock`
    - Call OpenAI's API using `httpx` and your OPENAI_API_KEY
    - Parse the LLM response into `predictedRuptureDate`, `confidence`, `explanation`
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        # In dev we allow running without a real key and return a fake response
        dummy_date = date.today()
        return OpenAIPredictionResponse(
            predictedRuptureDate=dummy_date,
            confidence=0.0,
            explanation="Dummy prediction – configure OPENAI_API_KEY to enable real calls.",
        )

    # TODO: implement real call to OpenAI API using httpx:
    # async with httpx.AsyncClient(timeout=10) as client:
    #     response = await client.post("https://api.openai.com/v1/chat/completions", ...)
    #     response.raise_for_status()
    #     data = response.json()
    #     # Parse data into prediction + confidence + explanation

    # Temporary placeholder until implementation is done
    raise HTTPException(
        status_code=501,
        detail="OpenAI-based prediction not implemented yet. See TODO in code.",
    )

