"""
Unit tests for ML training pipeline. Epic 5.1.
"""
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from app.ml.models.baseline import BaselineConsumptionModel
from app.ml.training.pipeline import run_training_pipeline


@pytest.fixture
def tmp_artifact_dir(tmp_path):
    """Patch the default artifact dir to a temp directory."""
    with patch("app.ml.models.baseline._default_baseline_artifact_dir", return_value=tmp_path):
        with patch("app.ml.registry._default_baseline_artifact_dir", return_value=tmp_path):
            yield tmp_path


@pytest.fixture
def tmp_mlflow_dir(tmp_path):
    """Patch MLflow tracking URI to temp directory with proper file:// URI."""
    mlflow_dir = tmp_path / "mlruns"
    mlflow_dir.mkdir()
    # MLflow on Windows requires file:/// URI, not raw paths
    mlflow_uri = mlflow_dir.as_uri()
    with patch("app.ml.config.get_mlflow_tracking_uri", return_value=mlflow_uri):
        yield mlflow_dir


def test_pipeline_no_data_returns_default_model(tmp_artifact_dir, tmp_mlflow_dir):
    """Pipeline with no data returns a default baseline model."""
    model, version = run_training_pipeline(
        tenant_id=None,
        sales_data=None,
        model_version="test-v1",
    )
    assert isinstance(model, BaselineConsumptionModel)
    assert version == "test-v1"
    assert model.daily_consumption == 1.0


def test_pipeline_with_sales_data(tmp_artifact_dir, tmp_mlflow_dir):
    """Pipeline with sales data trains a model and logs to MLflow."""
    sales_data = pd.DataFrame({
        "date": pd.date_range("2026-01-01", periods=10, freq="D"),
        "quantity": [5.0, 6.0, 4.0, 7.0, 5.5, 6.5, 4.5, 7.5, 5.0, 6.0],
    })
    model, version = run_training_pipeline(
        tenant_id="tenant-abc",
        sales_data=sales_data,
        model_version="trained-v1",
    )
    assert isinstance(model, BaselineConsumptionModel)
    assert version == "trained-v1"
    # Should have learned a consumption rate > 0
    assert model.daily_consumption > 0


def test_pipeline_with_tenant_isolation(tmp_artifact_dir, tmp_mlflow_dir):
    """Pipeline respects tenant_id parameter for isolation."""
    model, version = run_training_pipeline(
        tenant_id="tenant-xyz",
        sales_data=None,
        model_version="iso-v1",
    )
    assert isinstance(model, BaselineConsumptionModel)
    assert version == "iso-v1"


def test_pipeline_auto_generates_version(tmp_artifact_dir, tmp_mlflow_dir):
    """Pipeline generates a timestamp version when none provided."""
    model, version = run_training_pipeline(
        tenant_id=None,
        sales_data=None,
        model_version=None,
    )
    assert isinstance(model, BaselineConsumptionModel)
    # Version should be a timestamp string (numeric)
    assert version.isdigit()


def test_pipeline_saves_artifact(tmp_artifact_dir, tmp_mlflow_dir):
    """Pipeline saves versioned model artifact to disk."""
    model, version = run_training_pipeline(
        tenant_id=None,
        sales_data=None,
        model_version="save-test",
    )
    # Check versioned file was created via registry
    versioned = tmp_artifact_dir / "model_save-test.joblib"
    assert versioned.exists()
    # Check latest was also updated
    assert (tmp_artifact_dir / "model_latest.joblib").exists()
    assert (tmp_artifact_dir / "version.txt").read_text().strip() == "save-test"
