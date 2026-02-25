"""
Unit tests for accuracy tracking and longitudinal precision monitoring.
Epic 5 Story 5.2 - Task 5.
"""
import numpy as np
import pandas as pd
import pytest
from datetime import datetime, timedelta

from app.ml.accuracy_tracker import (
    AccuracyTracker,
    AccuracySnapshot,
    AccuracyEvolution,
    MAX_SNAPSHOTS_PER_TENANT,
)
from app.ml.models.baseline import BaselineConsumptionModel


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tracker():
    return AccuracyTracker()


def _make_sales(start: str, n: int, base_qty: float, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "date": pd.date_range(start, periods=n, freq="D"),
        "quantity": [base_qty + rng.normal(0, 0.5) for _ in range(n)],
    })


# ---------------------------------------------------------------------------
# Tests: AccuracySnapshot computation
# ---------------------------------------------------------------------------

class TestAccuracySnapshot:

    def test_evaluate_returns_snapshot(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 20, 10.0)
        snapshot = tracker.evaluate_accuracy(model, data, model_version="v1")

        assert isinstance(snapshot, AccuracySnapshot)
        assert snapshot.data_points == 20
        assert snapshot.model_version == "v1"
        assert snapshot.mae >= 0
        assert snapshot.rmse >= 0
        assert snapshot.timestamp > 0

    def test_perfect_prediction_has_low_error(self, tracker):
        """If model matches data perfectly, errors should be very low."""
        model = BaselineConsumptionModel(daily_consumption=10.0)
        # Data with exactly 10.0 per day
        data = pd.DataFrame({
            "date": pd.date_range("2026-01-01", periods=10, freq="D"),
            "quantity": [10.0] * 10,
        })
        snapshot = tracker.evaluate_accuracy(model, data)
        assert snapshot.mae < 0.01
        assert snapshot.rmse < 0.01

    def test_poor_prediction_has_high_error(self, tracker):
        """If model is far off, errors should be high."""
        model = BaselineConsumptionModel(daily_consumption=1.0)
        data = _make_sales("2026-01-01", 20, 50.0)
        snapshot = tracker.evaluate_accuracy(model, data)
        assert snapshot.mae > 10.0  # Big difference: model=1, actual=50

    def test_mape_computed(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 15, 10.0)
        snapshot = tracker.evaluate_accuracy(model, data)
        assert snapshot.mape is not None
        assert snapshot.mape >= 0

    def test_r_squared_computed(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 15, 10.0)
        snapshot = tracker.evaluate_accuracy(model, data)
        assert isinstance(snapshot.r_squared, float)

    def test_empty_data_returns_zero_metrics(self, tracker):
        model = BaselineConsumptionModel()
        snapshot = tracker.evaluate_accuracy(model, pd.DataFrame())
        assert snapshot.data_points == 0
        assert snapshot.mae == 0.0

    def test_snapshot_to_dict(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=5.0)
        data = _make_sales("2026-01-01", 10, 5.0)
        snapshot = tracker.evaluate_accuracy(model, data)
        d = snapshot.to_dict()
        assert isinstance(d, dict)
        assert "mae" in d
        assert "rmse" in d
        assert "r_squared" in d

    def test_tenant_id_stored(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=5.0)
        data = _make_sales("2026-01-01", 10, 5.0)
        snapshot = tracker.evaluate_accuracy(model, data, tenant_id="tenant-abc")
        assert snapshot.tenant_id == "tenant-abc"


# ---------------------------------------------------------------------------
# Tests: Longitudinal evolution
# ---------------------------------------------------------------------------

class TestAccuracyEvolution:

    def test_single_snapshot_stable(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 10, 10.0)
        tracker.evaluate_accuracy(model, data, model_version="v1")

        evolution = tracker.get_evolution()
        assert len(evolution.snapshots) == 1
        assert evolution.trend_direction == "stable"

    def test_improving_trend(self, tracker):
        """When MAE decreases, trend should be improving."""
        data = _make_sales("2026-01-01", 20, 10.0)

        # First snapshot: bad model
        bad_model = BaselineConsumptionModel(daily_consumption=5.0)
        tracker.evaluate_accuracy(bad_model, data, model_version="v1")

        # Second snapshot: better model
        good_model = BaselineConsumptionModel(daily_consumption=10.0)
        tracker.evaluate_accuracy(good_model, data, model_version="v2")

        evolution = tracker.get_evolution()
        assert len(evolution.snapshots) == 2
        assert evolution.improving is True
        assert evolution.trend_direction == "improving"

    def test_degrading_trend(self, tracker):
        """When MAE increases, trend should be degrading."""
        data = _make_sales("2026-01-01", 20, 10.0)

        # First snapshot: good model
        good_model = BaselineConsumptionModel(daily_consumption=10.0)
        tracker.evaluate_accuracy(good_model, data, model_version="v1")

        # Second snapshot: bad model
        bad_model = BaselineConsumptionModel(daily_consumption=3.0)
        tracker.evaluate_accuracy(bad_model, data, model_version="v2")

        evolution = tracker.get_evolution()
        assert evolution.improving is False
        assert evolution.trend_direction == "degrading"

    def test_evolution_per_tenant(self, tracker):
        """Each tenant has independent evolution tracking."""
        data = _make_sales("2026-01-01", 10, 10.0)
        model = BaselineConsumptionModel(daily_consumption=10.0)

        tracker.evaluate_accuracy(model, data, model_version="v1", tenant_id="A")
        tracker.evaluate_accuracy(model, data, model_version="v1", tenant_id="B")

        evo_a = tracker.get_evolution(tenant_id="A")
        evo_b = tracker.get_evolution(tenant_id="B")

        assert len(evo_a.snapshots) == 1
        assert len(evo_b.snapshots) == 1

    def test_evolution_to_dict(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 10, 10.0)
        tracker.evaluate_accuracy(model, data, model_version="v1")
        tracker.evaluate_accuracy(model, data, model_version="v2")

        evolution = tracker.get_evolution()
        d = evolution.to_dict()
        assert isinstance(d, dict)
        assert "snapshots" in d
        assert "improving" in d
        assert "trend_direction" in d
        assert "total_snapshots" in d


# ---------------------------------------------------------------------------
# Tests: Latest snapshot and reset
# ---------------------------------------------------------------------------

class TestLatestAndReset:

    def test_get_latest_snapshot(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 10, 10.0)
        tracker.evaluate_accuracy(model, data, model_version="v1")
        tracker.evaluate_accuracy(model, data, model_version="v2")

        latest = tracker.get_latest_snapshot()
        assert latest is not None
        assert latest.model_version == "v2"

    def test_get_latest_none_when_empty(self, tracker):
        assert tracker.get_latest_snapshot() is None

    def test_reset_clears_snapshots(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 10, 10.0)
        tracker.evaluate_accuracy(model, data)
        tracker.reset()
        assert tracker.get_latest_snapshot() is None
        assert len(tracker.get_evolution().snapshots) == 0

    def test_reset_only_affects_target_tenant(self, tracker):
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 10, 10.0)
        tracker.evaluate_accuracy(model, data, tenant_id="A")
        tracker.evaluate_accuracy(model, data, tenant_id="B")

        tracker.reset(tenant_id="A")
        assert tracker.get_latest_snapshot(tenant_id="A") is None
        assert tracker.get_latest_snapshot(tenant_id="B") is not None


# ---------------------------------------------------------------------------
# Tests: Data validation and snapshot limit
# ---------------------------------------------------------------------------

class TestPrepareDataValidation:

    def test_evaluate_accuracy_raises_on_single_column_data(self, tracker):
        """Data with only one column (no date/quantity) should raise ValueError."""
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = pd.DataFrame({"only_col": [1, 2, 3]})
        with pytest.raises(ValueError) as exc_info:
            tracker.evaluate_accuracy(model, data)
        assert "date" in str(exc_info.value).lower() or "quantity" in str(exc_info.value).lower()


class TestSnapshotEviction:

    def test_snapshots_evicted_when_over_limit(self):
        """When exceeding max_snapshots_per_tenant, oldest snapshots are evicted (FIFO)."""
        t = AccuracyTracker(max_snapshots_per_tenant=3)
        model = BaselineConsumptionModel(daily_consumption=10.0)
        data = _make_sales("2026-01-01", 5, 10.0)
        for i in range(5):
            t.evaluate_accuracy(model, data, model_version=f"v{i}")
        evolution = t.get_evolution()
        assert len(evolution.snapshots) == 3
        # Last three versions kept
        assert evolution.snapshots[0].model_version == "v2"
        assert evolution.snapshots[1].model_version == "v3"
        assert evolution.snapshots[2].model_version == "v4"
