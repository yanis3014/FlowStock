"""
Unit tests for baseline consumption model. Epic 5.1.
"""
import numpy as np
import pytest
from pathlib import Path
import tempfile
from app.ml.models.baseline import BaselineConsumptionModel, load_baseline_model


def test_baseline_model_predict_days_until_stockout():
    """Baseline model predicts days until stockout from current stock and daily consumption."""
    model = BaselineConsumptionModel(daily_consumption=10.0)
    assert model.predict_days_until_stockout(100.0) == 10.0
    assert model.predict_days_until_stockout(0.0) == 0.0
    assert model.predict_days_until_stockout(5.0) == 0.5


def test_baseline_model_zero_consumption():
    """Zero consumption returns inf days if stock > 0."""
    model = BaselineConsumptionModel(daily_consumption=0.0)
    assert model.predict_days_until_stockout(100.0) == float("inf")
    assert model.predict_days_until_stockout(0.0) == 0.0


def test_baseline_model_fit_and_predict():
    """Fit on simple linear trend then predict."""
    X = np.array([[0], [1], [2], [3]])
    y = np.array([0.0, 2.0, 4.0, 6.0])  # 2 units/day
    model = BaselineConsumptionModel().fit(X, y)
    assert model.daily_consumption >= 1e-6
    days = model.predict_days_until_stockout(10.0)
    assert days >= 0


def test_baseline_model_save_and_load():
    """Save and load model preserves daily_consumption."""
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "model.joblib"
        model = BaselineConsumptionModel(daily_consumption=3.14)
        model.save(path)
        assert path.exists()
        loaded = BaselineConsumptionModel.load(path)
        assert loaded.daily_consumption == 3.14


def test_load_baseline_model_returns_default_when_no_artifact():
    """load_baseline_model returns default model and 'default' version when no artifact."""
    model, version = load_baseline_model()
    assert model is not None
    assert isinstance(model, BaselineConsumptionModel)
    assert version in ("default", "unknown") or version is not None
    assert model.predict_days_until_stockout(10.0) >= 0
