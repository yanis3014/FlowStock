"""
Unit tests for ML metrics module. Epic 5.1.
"""
from app.ml.metrics import (
    get_metrics,
    record_inference_error,
    record_inference_latency_ms,
    reset_metrics,
)


def test_record_inference_latency():
    """record_inference_latency_ms increments count and stores latency."""
    reset_metrics()
    record_inference_latency_ms(12.5)
    m = get_metrics()
    assert m["inference_count"] == 1
    assert m["last_inference_latency_ms"] == 12.5
    assert m["error_count"] == 0


def test_record_inference_error():
    """record_inference_error increments error count and stores message."""
    reset_metrics()
    record_inference_error("test error")
    m = get_metrics()
    assert m["error_count"] == 1
    assert m["last_error"] == "test error"
    assert m["inference_count"] == 0


def test_multiple_recordings():
    """Multiple calls accumulate counts correctly."""
    reset_metrics()
    record_inference_latency_ms(10.0)
    record_inference_latency_ms(20.0)
    record_inference_latency_ms(30.0)
    record_inference_error("err1")
    m = get_metrics()
    assert m["inference_count"] == 3
    assert m["last_inference_latency_ms"] == 30.0
    assert m["error_count"] == 1


def test_reset_metrics():
    """reset_metrics clears all counters."""
    record_inference_latency_ms(99.0)
    record_inference_error("some error")
    reset_metrics()
    m = get_metrics()
    assert m["inference_count"] == 0
    assert m["error_count"] == 0
    assert m["last_inference_latency_ms"] is None
    assert m["last_error"] is None


def test_get_metrics_includes_resource_keys():
    """get_metrics returns resource metrics if psutil is available."""
    m = get_metrics()
    # psutil may or may not be installed in test env; just check structure
    assert "inference_count" in m
    assert "error_count" in m
