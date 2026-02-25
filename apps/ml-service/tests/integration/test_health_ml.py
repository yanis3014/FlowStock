"""
Integration tests for /api/v1/health/ml endpoint. Epic 5.1.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_ml_returns_200_and_model_loaded(client):
    """GET /api/v1/health/ml returns 200 and ml.model_loaded true after startup."""
    # App lifespan runs on first request when using TestClient; ensure ML is loaded
    from app.ml.inference import load_model_at_startup
    load_model_at_startup()
    r = client.get("/api/v1/health/ml")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert "ml" in data
    assert data["ml"].get("model_loaded") is True
    assert "version" in data["ml"]
    # Verify metrics keys are present (H3/M1 fix)
    assert "inference_count" in data["ml"]
    assert "error_count" in data["ml"]
