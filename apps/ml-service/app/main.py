from datetime import date, datetime
from typing import List

import os

import httpx
from fastapi import FastAPI, HTTPException
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


app = FastAPI(title="BMAD ML Service", version=APP_VERSION)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "bmad-ml-service",
        "version": APP_VERSION,
        "timestamp": datetime.now().isoformat(),
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

