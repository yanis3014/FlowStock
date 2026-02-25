"""
Unit tests for ML inference (active model, load at startup, predict with metrics). Epic 5.1.
"""
import pytest
from app.ml.inference import (
    get_active_model,
    get_active_model_version,
    load_model_at_startup,
    predict_days_until_stockout,
    set_active_model,
)
from app.ml.metrics import get_metrics, reset_metrics
from app.ml.models.baseline import BaselineConsumptionModel


def test_set_and_get_active_model():
    """set_active_model and get_active_model roundtrip."""
    set_active_model(None, None)
    assert get_active_model() is None
    assert get_active_model_version() is None
    model = BaselineConsumptionModel(daily_consumption=2.0)
    set_active_model(model, "v1")
    assert get_active_model() is model
    assert get_active_model_version() == "v1"
    set_active_model(None, None)


def test_load_model_at_startup_sets_model():
    """load_model_at_startup sets a non-None active model (default baseline)."""
    set_active_model(None, None)
    load_model_at_startup()
    assert get_active_model() is not None
    assert get_active_model_version() is not None


def test_predict_days_until_stockout_records_metrics():
    """predict_days_until_stockout records latency in metrics."""
    reset_metrics()
    model = BaselineConsumptionModel(daily_consumption=5.0)
    set_active_model(model, "test-v1")

    result = predict_days_until_stockout(50.0, tenant_id="tenant-abc")
    assert result["days_until_stockout"] == 10.0
    assert result["daily_consumption"] == 5.0
    assert result["model_version"] == "test-v1"
    assert result["latency_ms"] >= 0

    m = get_metrics()
    assert m["inference_count"] == 1
    assert m["last_inference_latency_ms"] is not None
    assert m["last_inference_latency_ms"] >= 0

    # Cleanup
    set_active_model(None, None)
    reset_metrics()


def test_predict_raises_when_no_model():
    """predict_days_until_stockout raises RuntimeError if no model is loaded."""
    reset_metrics()
    set_active_model(None, None)
    with pytest.raises(RuntimeError, match="No ML model loaded"):
        predict_days_until_stockout(10.0)

    m = get_metrics()
    assert m["error_count"] == 1
    reset_metrics()
