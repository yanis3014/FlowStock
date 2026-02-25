"""
Unit tests for ML model registry. Epic 5.1.
"""
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from app.ml.models.baseline import BaselineConsumptionModel
from app.ml.registry import (
    list_registered_versions,
    load_version,
    rollback_to_version,
    save_model_version,
)


@pytest.fixture
def tmp_artifact_dir(tmp_path):
    """Patch the default artifact dir to a temp directory."""
    with patch("app.ml.models.baseline._default_baseline_artifact_dir", return_value=tmp_path):
        with patch("app.ml.registry._default_baseline_artifact_dir", return_value=tmp_path):
            yield tmp_path


def test_list_versions_always_has_default(tmp_artifact_dir):
    """Default version is always present even with empty artifact dir."""
    versions = list_registered_versions()
    version_ids = [v for v, _ in versions]
    assert "default" in version_ids


def test_save_and_list_versions(tmp_artifact_dir):
    """save_model_version creates versioned + latest files."""
    model = BaselineConsumptionModel(daily_consumption=5.0)
    save_model_version(model, "v1.0.0")

    versions = list_registered_versions()
    version_ids = [v for v, _ in versions]
    assert "default" in version_ids
    assert "v1.0.0" in version_ids

    # model_v1.0.0.joblib should exist
    assert (tmp_artifact_dir / "model_v1.0.0.joblib").exists()
    # model_latest.joblib should also exist
    assert (tmp_artifact_dir / "model_latest.joblib").exists()
    # version.txt should have the latest version
    assert (tmp_artifact_dir / "version.txt").read_text().strip() == "v1.0.0"


def test_save_multiple_versions(tmp_artifact_dir):
    """Multiple versions can be saved and all are listed."""
    m1 = BaselineConsumptionModel(daily_consumption=1.0)
    m2 = BaselineConsumptionModel(daily_consumption=2.0)
    m3 = BaselineConsumptionModel(daily_consumption=3.0)

    save_model_version(m1, "v1")
    save_model_version(m2, "v2")
    save_model_version(m3, "v3")

    versions = list_registered_versions()
    version_ids = [v for v, _ in versions]
    assert "v1" in version_ids
    assert "v2" in version_ids
    assert "v3" in version_ids


def test_load_version_default(tmp_artifact_dir):
    """Loading 'default' returns the built-in baseline."""
    model = load_version("default")
    assert model is not None
    assert isinstance(model, BaselineConsumptionModel)


def test_load_version_saved(tmp_artifact_dir):
    """Loading a saved version returns the correct model."""
    original = BaselineConsumptionModel(daily_consumption=7.5)
    save_model_version(original, "v42")

    loaded = load_version("v42")
    assert loaded is not None
    assert abs(loaded.daily_consumption - 7.5) < 0.01


def test_load_version_not_found(tmp_artifact_dir):
    """Loading a non-existent version returns None."""
    result = load_version("nonexistent")
    assert result is None


def test_rollback_to_version(tmp_artifact_dir):
    """rollback_to_version sets active model to the specified version."""
    from app.ml.inference import get_active_model, get_active_model_version, set_active_model

    # Setup: save a version and set a different active model
    model_v1 = BaselineConsumptionModel(daily_consumption=4.0)
    save_model_version(model_v1, "v1")
    set_active_model(BaselineConsumptionModel(daily_consumption=99.0), "current")

    # Rollback
    ok = rollback_to_version("v1")
    assert ok is True
    assert get_active_model_version() == "v1"
    assert abs(get_active_model().daily_consumption - 4.0) < 0.01

    # Cleanup
    set_active_model(None, None)


def test_rollback_to_nonexistent_version(tmp_artifact_dir):
    """rollback_to_version returns False for non-existent version."""
    ok = rollback_to_version("ghost-version")
    assert ok is False
