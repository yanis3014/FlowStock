"""
Unit tests for structured learning logger.
Epic 5 Story 5.2 - Task 6.
Tests: parameter logging, metrics, duration, tenant isolation, MLflow integration.
"""
import time
import pytest
from unittest.mock import patch, MagicMock

from app.ml.training.learning_logger import (
    LearningLogger,
    TrainingLogEntry,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def logger_instance():
    """LearningLogger with MLflow disabled for unit tests."""
    return LearningLogger(use_mlflow=False)


# ---------------------------------------------------------------------------
# Tests: Basic logging
# ---------------------------------------------------------------------------

class TestBasicLogging:

    def test_track_training_creates_entry(self, logger_instance):
        with logger_instance.track_training(
            run_id="run-1",
            model_type="BaselineConsumption",
            model_version="v1",
        ) as entry:
            entry.metrics["mae"] = 0.5
            entry.data_points = 100

        assert logger_instance.entry_count == 1
        latest = logger_instance.get_latest_entry()
        assert latest.run_id == "run-1"
        assert latest.status == "success"
        assert latest.metrics["mae"] == 0.5
        assert latest.data_points == 100

    def test_duration_recorded(self, logger_instance):
        with logger_instance.track_training(run_id="run-dur") as entry:
            time.sleep(0.05)

        latest = logger_instance.get_latest_entry()
        assert latest.duration_seconds >= 0.04

    def test_parameters_logged(self, logger_instance):
        params = {"learning_rate": 0.01, "epochs": 10}
        with logger_instance.track_training(
            run_id="run-params",
            parameters=params,
        ) as entry:
            pass

        latest = logger_instance.get_latest_entry()
        assert latest.parameters == params

    def test_tenant_id_recorded(self, logger_instance):
        with logger_instance.track_training(
            run_id="run-tenant",
            tenant_id="tenant-abc",
        ) as entry:
            pass

        latest = logger_instance.get_latest_entry()
        assert latest.tenant_id == "tenant-abc"

    def test_model_info_recorded(self, logger_instance):
        with logger_instance.track_training(
            run_id="run-model",
            model_type="CustomModel",
            model_version="v2.1",
        ) as entry:
            pass

        latest = logger_instance.get_latest_entry()
        assert latest.model_type == "CustomModel"
        assert latest.model_version == "v2.1"


# ---------------------------------------------------------------------------
# Tests: Error handling
# ---------------------------------------------------------------------------

class TestErrorHandling:

    def test_failed_training_logged(self, logger_instance):
        with pytest.raises(ValueError):
            with logger_instance.track_training(run_id="run-fail") as entry:
                raise ValueError("Training exploded")

        latest = logger_instance.get_latest_entry()
        assert latest.status == "failed"
        assert "Training exploded" in latest.error_message

    def test_duration_recorded_on_failure(self, logger_instance):
        with pytest.raises(RuntimeError):
            with logger_instance.track_training(run_id="run-fail-dur") as entry:
                time.sleep(0.02)
                raise RuntimeError("boom")

        latest = logger_instance.get_latest_entry()
        assert latest.duration_seconds >= 0.01


# ---------------------------------------------------------------------------
# Tests: Multiple entries and filtering
# ---------------------------------------------------------------------------

class TestMultipleEntries:

    def test_multiple_runs_tracked(self, logger_instance):
        for i in range(3):
            with logger_instance.track_training(run_id=f"run-{i}") as entry:
                entry.metrics["iteration"] = i

        assert logger_instance.entry_count == 3

    def test_filter_by_tenant(self, logger_instance):
        with logger_instance.track_training(run_id="r1", tenant_id="A") as e:
            pass
        with logger_instance.track_training(run_id="r2", tenant_id="B") as e:
            pass
        with logger_instance.track_training(run_id="r3", tenant_id="A") as e:
            pass

        a_entries = logger_instance.get_entries_for_tenant("A")
        assert len(a_entries) == 2
        b_entries = logger_instance.get_entries_for_tenant("B")
        assert len(b_entries) == 1

    def test_get_latest_returns_most_recent(self, logger_instance):
        with logger_instance.track_training(run_id="first") as e:
            pass
        with logger_instance.track_training(run_id="second") as e:
            pass

        assert logger_instance.get_latest_entry().run_id == "second"

    def test_get_latest_none_when_empty(self, logger_instance):
        assert logger_instance.get_latest_entry() is None


# ---------------------------------------------------------------------------
# Tests: Summary
# ---------------------------------------------------------------------------

class TestSummary:

    def test_summary_basic(self, logger_instance):
        with logger_instance.track_training(run_id="r1", tenant_id="A") as e:
            pass
        with logger_instance.track_training(run_id="r2", tenant_id="B") as e:
            pass

        summary = logger_instance.get_summary()
        assert summary["total_runs"] == 2
        assert summary["successes"] == 2
        assert summary["failures"] == 0
        assert summary["unique_tenants"] == 2
        assert "A" in summary["tenant_ids"]
        assert "B" in summary["tenant_ids"]

    def test_summary_with_failures(self, logger_instance):
        with logger_instance.track_training(run_id="r1") as e:
            pass
        with pytest.raises(ValueError):
            with logger_instance.track_training(run_id="r2") as e:
                raise ValueError("fail")

        summary = logger_instance.get_summary()
        assert summary["total_runs"] == 2
        assert summary["successes"] == 1
        assert summary["failures"] == 1

    def test_summary_empty(self, logger_instance):
        summary = logger_instance.get_summary()
        assert summary["total_runs"] == 0
        assert summary["average_duration_seconds"] == 0.0


# ---------------------------------------------------------------------------
# Tests: Manual entry and serialization
# ---------------------------------------------------------------------------

class TestManualEntry:

    def test_manual_log_entry(self, logger_instance):
        entry = TrainingLogEntry(
            run_id="manual-1",
            tenant_id="X",
            model_type="Custom",
            model_version="v1",
            start_time=time.time(),
            end_time=time.time(),
            duration_seconds=1.5,
            status="success",
            parameters={"lr": 0.001},
            metrics={"mae": 0.3},
            data_points=50,
        )
        logger_instance.log_entry(entry)
        assert logger_instance.entry_count == 1
        assert logger_instance.get_latest_entry().run_id == "manual-1"

    def test_entry_to_dict(self, logger_instance):
        with logger_instance.track_training(
            run_id="r-dict",
            tenant_id="T",
            parameters={"a": 1},
        ) as e:
            e.metrics["loss"] = 0.01

        d = logger_instance.get_latest_entry().to_dict()
        assert isinstance(d, dict)
        assert d["run_id"] == "r-dict"
        assert d["tenant_id"] == "T"
        assert d["parameters"]["a"] == 1
        assert d["metrics"]["loss"] == 0.01
        assert d["status"] == "success"


# ---------------------------------------------------------------------------
# Tests: Integration with training pipeline flow
# ---------------------------------------------------------------------------

class TestIntegrationFlow:
    """Simulates a complete training flow using the learning logger."""

    def test_complete_training_flow(self, logger_instance):
        """Simulate: load data → train → log metrics → finish."""
        with logger_instance.track_training(
            run_id="flow-1",
            tenant_id="tenant-123",
            model_type="BaselineConsumption",
            model_version="v3",
            parameters={
                "learning_rate": 0.01,
                "batch_size": 32,
                "update_type": "partial_fit",
            },
            data_points=100,
            data_date_range="2026-01-01 to 2026-04-10",
        ) as entry:
            # Simulate training
            time.sleep(0.01)
            entry.metrics["mae"] = 1.23
            entry.metrics["rmse"] = 1.56
            entry.metrics["daily_consumption"] = 8.5
            entry.data_points = 100

        latest = logger_instance.get_latest_entry()
        assert latest.status == "success"
        assert latest.tenant_id == "tenant-123"
        assert latest.metrics["mae"] == 1.23
        assert latest.parameters["learning_rate"] == 0.01
        assert latest.data_date_range == "2026-01-01 to 2026-04-10"
        assert latest.duration_seconds > 0
