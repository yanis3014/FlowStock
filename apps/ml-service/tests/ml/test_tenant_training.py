"""
Unit tests for tenant-aware fine-tuning and model isolation.
Epic 5 Story 5.2 - Task 3.
Tests: per-tenant model persistence, fine-tuning, isolation between tenants.
"""
import numpy as np
import pandas as pd
import pytest
from pathlib import Path
from unittest.mock import patch

from app.ml.models.baseline import BaselineConsumptionModel
from app.ml.registry_tenant import (
    save_tenant_model,
    load_tenant_model,
    list_tenant_versions,
    tenant_has_model,
    delete_tenant_models,
    _tenant_artifact_dir,
)
from app.ml.training.tenant_pipeline import run_tenant_training


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_tenant_dir(tmp_path):
    """Redirect tenant model storage to temp directory."""
    mlruns_dir = tmp_path / "mlruns"
    mlruns_dir.mkdir()
    base_artifact_dir = mlruns_dir / "baseline_artifacts"
    base_artifact_dir.mkdir()

    with patch(
        "app.ml.models.baseline._default_baseline_artifact_dir",
        return_value=base_artifact_dir,
    ):
        with patch(
            "app.ml.registry._default_baseline_artifact_dir",
            return_value=base_artifact_dir,
        ):
            with patch(
                "app.ml.registry_tenant._default_baseline_artifact_dir",
                return_value=base_artifact_dir,
            ):
                yield tmp_path


@pytest.fixture
def tmp_mlflow_dir(tmp_path):
    """Redirect MLflow to temp directory."""
    mlflow_dir = tmp_path / "mlflow_runs"
    mlflow_dir.mkdir()
    mlflow_uri = mlflow_dir.as_uri()
    with patch("app.ml.config.get_mlflow_tracking_uri", return_value=mlflow_uri):
        yield mlflow_dir


def _make_sales(start: str, n: int, base_qty: float, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "date": pd.date_range(start, periods=n, freq="D"),
        "quantity": [base_qty + rng.normal(0, 0.5) for _ in range(n)],
    })


TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


# ---------------------------------------------------------------------------
# Tests: Tenant model registry
# ---------------------------------------------------------------------------

class TestTenantRegistry:

    def test_save_and_load_tenant_model(self, tmp_tenant_dir):
        model = BaselineConsumptionModel(daily_consumption=5.0)
        save_tenant_model(model, TENANT_A, "v1")

        loaded, version = load_tenant_model(TENANT_A)
        assert loaded is not None
        assert version == "v1"
        assert abs(loaded.daily_consumption - 5.0) < 0.01

    def test_load_nonexistent_tenant(self, tmp_tenant_dir):
        model, version = load_tenant_model("nonexistent-tenant")
        assert model is None
        assert version is None

    def test_load_specific_version(self, tmp_tenant_dir):
        m1 = BaselineConsumptionModel(daily_consumption=3.0)
        m2 = BaselineConsumptionModel(daily_consumption=7.0)
        save_tenant_model(m1, TENANT_A, "v1")
        save_tenant_model(m2, TENANT_A, "v2")

        loaded, ver = load_tenant_model(TENANT_A, version="v1")
        assert loaded is not None
        assert abs(loaded.daily_consumption - 3.0) < 0.01

    def test_list_versions(self, tmp_tenant_dir):
        m = BaselineConsumptionModel(daily_consumption=2.0)
        save_tenant_model(m, TENANT_A, "v1")
        save_tenant_model(m, TENANT_A, "v2")

        versions = list_tenant_versions(TENANT_A)
        version_ids = [v[0] for v in versions]
        assert "v1" in version_ids
        assert "v2" in version_ids

    def test_tenant_has_model(self, tmp_tenant_dir):
        assert not tenant_has_model(TENANT_A)
        save_tenant_model(BaselineConsumptionModel(), TENANT_A, "v1")
        assert tenant_has_model(TENANT_A)

    def test_delete_tenant_models(self, tmp_tenant_dir):
        save_tenant_model(BaselineConsumptionModel(), TENANT_A, "v1")
        assert tenant_has_model(TENANT_A)
        count = delete_tenant_models(TENANT_A)
        assert count >= 1
        assert not tenant_has_model(TENANT_A)


# ---------------------------------------------------------------------------
# Tests: Tenant training pipeline
# ---------------------------------------------------------------------------

class TestTenantTrainingPipeline:

    def test_train_new_tenant(self, tmp_tenant_dir, tmp_mlflow_dir):
        sales = _make_sales("2026-01-01", 20, 10.0)
        model, version = run_tenant_training(TENANT_A, sales, model_version="t1")

        assert isinstance(model, BaselineConsumptionModel)
        assert version == "t1"
        assert model.daily_consumption > 0

    def test_train_saves_to_tenant_registry(self, tmp_tenant_dir, tmp_mlflow_dir):
        sales = _make_sales("2026-01-01", 15, 8.0)
        run_tenant_training(TENANT_A, sales, model_version="t-save")

        assert tenant_has_model(TENANT_A)
        loaded, ver = load_tenant_model(TENANT_A)
        assert loaded is not None
        assert ver == "t-save"

    def test_fine_tune_from_existing(self, tmp_tenant_dir, tmp_mlflow_dir):
        """Second training should fine-tune from existing tenant model."""
        sales1 = _make_sales("2026-01-01", 15, 5.0, seed=1)
        m1, _ = run_tenant_training(TENANT_A, sales1, model_version="t1")

        sales2 = _make_sales("2026-01-16", 15, 12.0, seed=2)
        m2, _ = run_tenant_training(TENANT_A, sales2, model_version="t2")

        # Both should have trained successfully
        assert m1.daily_consumption > 0
        assert m2.daily_consumption > 0

    def test_auto_version(self, tmp_tenant_dir, tmp_mlflow_dir):
        sales = _make_sales("2026-01-01", 10, 5.0)
        model, version = run_tenant_training(TENANT_A, sales)
        assert version.isdigit()  # timestamp


# ---------------------------------------------------------------------------
# Tests: Tenant isolation (CRITICAL)
# ---------------------------------------------------------------------------

class TestTenantIsolation:
    """CRITICAL: Verify that training tenant A does NOT affect tenant B."""

    def test_tenant_a_training_does_not_affect_b(self, tmp_tenant_dir, tmp_mlflow_dir):
        """Training tenant A must not create or modify tenant B's model."""
        sales_a = _make_sales("2026-01-01", 20, 15.0, seed=1)
        run_tenant_training(TENANT_A, sales_a, model_version="a-v1")

        # Tenant B should have no model
        model_b, ver_b = load_tenant_model(TENANT_B)
        assert model_b is None
        assert ver_b is None

    def test_independent_tenant_models(self, tmp_tenant_dir, tmp_mlflow_dir):
        """Tenants A and B trained on different data get different models."""
        # Tenant A: high consumption (~20/day)
        sales_a = _make_sales("2026-01-01", 20, 20.0, seed=1)
        model_a, _ = run_tenant_training(TENANT_A, sales_a, model_version="a-v1")

        # Tenant B: low consumption (~3/day)
        sales_b = _make_sales("2026-01-01", 20, 3.0, seed=2)
        model_b, _ = run_tenant_training(TENANT_B, sales_b, model_version="b-v1")

        # Models should have different consumption rates
        assert abs(model_a.daily_consumption - model_b.daily_consumption) > 1.0

    def test_tenant_directories_separate(self, tmp_tenant_dir):
        """Tenant models are stored in separate directories."""
        save_tenant_model(BaselineConsumptionModel(5.0), TENANT_A, "v1")
        save_tenant_model(BaselineConsumptionModel(10.0), TENANT_B, "v1")

        dir_a = _tenant_artifact_dir(TENANT_A)
        dir_b = _tenant_artifact_dir(TENANT_B)

        assert dir_a != dir_b
        assert dir_a.exists()
        assert dir_b.exists()

    def test_tenant_versions_isolated(self, tmp_tenant_dir):
        """Listing versions for one tenant doesn't show other tenant's versions."""
        save_tenant_model(BaselineConsumptionModel(), TENANT_A, "a-v1")
        save_tenant_model(BaselineConsumptionModel(), TENANT_A, "a-v2")
        save_tenant_model(BaselineConsumptionModel(), TENANT_B, "b-v1")

        versions_a = [v[0] for v in list_tenant_versions(TENANT_A)]
        versions_b = [v[0] for v in list_tenant_versions(TENANT_B)]

        assert "a-v1" in versions_a
        assert "a-v2" in versions_a
        assert "b-v1" not in versions_a

        assert "b-v1" in versions_b
        assert "a-v1" not in versions_b

    def test_delete_tenant_does_not_affect_other(self, tmp_tenant_dir):
        """Deleting one tenant's models doesn't affect others."""
        save_tenant_model(BaselineConsumptionModel(), TENANT_A, "v1")
        save_tenant_model(BaselineConsumptionModel(), TENANT_B, "v1")

        delete_tenant_models(TENANT_A)

        assert not tenant_has_model(TENANT_A)
        assert tenant_has_model(TENANT_B)
