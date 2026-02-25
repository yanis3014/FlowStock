"""
Inference: run predictions with the active model.
Epic 5 Story 5.1 - Infrastructure ML & Modèles de base.
"""
import logging
import time
from typing import Optional

from app.ml.models.baseline import BaselineConsumptionModel, load_baseline_model

logger = logging.getLogger("bmad.ml.inference")

# Singleton: modèle actif chargé au démarrage (cold start = baseline)
_active_model: Optional[BaselineConsumptionModel] = None
_active_model_version: Optional[str] = None


def get_active_model() -> Optional[BaselineConsumptionModel]:
    """Return the currently loaded model (baseline or tenant-specific)."""
    return _active_model


def get_active_model_version() -> Optional[str]:
    """Return the version of the currently loaded model."""
    return _active_model_version


def set_active_model(model: Optional[BaselineConsumptionModel], version: Optional[str] = None) -> None:
    """Set the active model (used after load at startup or rollback)."""
    global _active_model, _active_model_version
    _active_model = model
    _active_model_version = version


def load_model_at_startup() -> None:
    """
    Load baseline model at startup for cold start.
    Does not fail if no trained model exists; baseline is always available.
    """
    model, version = load_baseline_model()
    set_active_model(model, version)
    logger.info("Active model set: version=%s, daily_consumption=%.4f", version, model.daily_consumption)


def predict_days_until_stockout(current_stock: float, tenant_id: Optional[str] = None) -> dict:
    """
    Run inference with the active model and record metrics.
    Returns dict with prediction results.
    Raises RuntimeError if no model is loaded.
    """
    from app.ml.metrics import record_inference_error, record_inference_latency_ms

    model = get_active_model()
    if model is None:
        record_inference_error("No model loaded")
        raise RuntimeError("No ML model loaded. Call load_model_at_startup() first.")

    start = time.perf_counter()
    try:
        days = model.predict_days_until_stockout(current_stock)
        latency_ms = (time.perf_counter() - start) * 1000
        record_inference_latency_ms(latency_ms)
        logger.debug(
            "Inference: stock=%.2f, days=%.2f, latency=%.2fms, tenant=%s",
            current_stock, days, latency_ms, tenant_id or "global",
        )
        return {
            "days_until_stockout": days,
            "current_stock": current_stock,
            "daily_consumption": model.daily_consumption,
            "model_version": get_active_model_version(),
            "latency_ms": round(latency_ms, 3),
        }
    except Exception as exc:
        latency_ms = (time.perf_counter() - start) * 1000
        record_inference_error(str(exc))
        logger.error("Inference failed: %s (latency=%.2fms)", exc, latency_ms)
        raise
