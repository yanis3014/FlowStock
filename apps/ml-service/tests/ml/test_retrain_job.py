"""
Tests for retrain_job: validation, rollback, summary. Story 5.4.
"""
import pandas as pd
import pytest
from unittest.mock import AsyncMock, patch

from app.ml.models.baseline import BaselineConsumptionModel
from app.ml.training.retrain_job import (
    run_retrain_job,
    run_retrain_for_tenant,
    RetrainResult,
    RetrainJobSummary,
    DEGRADATION_THRESHOLD,
)
from app.ml.accuracy_tracker import AccuracyTracker


TENANT_ID = "11111111-1111-1111-1111-111111111111"


def _sales_df(n=10, daily=5.0):
    return pd.DataFrame({
        "date": pd.date_range("2026-01-01", periods=n, freq="D"),
        "quantity": [daily] * n,
    })


@pytest.mark.asyncio
async def test_run_retrain_job_no_tenants():
    """When no tenants, summary is zero and no results."""
    with patch("app.ml.training.retrain_job.get_active_tenant_ids", new_callable=AsyncMock, return_value=[]):
        summary = await run_retrain_job()
    assert summary.total_tenants == 0
    assert summary.deployed == 0
    assert summary.rollback == 0
    assert len(summary.results) == 0
    assert "duration_seconds" in summary.to_log_dict()


@pytest.mark.asyncio
async def test_run_retrain_for_tenant_deploys_when_better():
    """When new model has lower MAE, we deploy."""
    sales_df = _sales_df(10, 5.0)
    current_model = BaselineConsumptionModel(daily_consumption=3.0)  # worse
    new_model = BaselineConsumptionModel(daily_consumption=5.0)    # better

    with patch("app.ml.training.retrain_job.load_sales_for_tenant_async", new_callable=AsyncMock, return_value=sales_df):
        with patch("app.ml.training.retrain_job.load_tenant_model", return_value=(current_model, "v1")):
            with patch("app.ml.training.retrain_job.run_tenant_training", return_value=(new_model, "v2")):
                with patch("app.ml.training.retrain_job.save_tenant_model") as save_mock:
                    tracker = AccuracyTracker()
                    loop = __import__("asyncio").get_running_loop()
                    result = await run_retrain_for_tenant(TENANT_ID, tracker, loop)

    assert result.deployed is True
    assert result.rollback is False
    assert result.new_mae is not None
    assert result.current_mae is not None
    assert result.new_mae <= result.current_mae * DEGRADATION_THRESHOLD
    save_mock.assert_called_once()


@pytest.mark.asyncio
async def test_run_retrain_for_tenant_rollback_when_worse():
    """When new model has higher MAE than threshold, we rollback (do not save)."""
    sales_df = _sales_df(10, 5.0)
    current_model = BaselineConsumptionModel(daily_consumption=5.0)  # good
    new_model = BaselineConsumptionModel(daily_consumption=1.0)     # worse

    with patch("app.ml.training.retrain_job.load_sales_for_tenant_async", new_callable=AsyncMock, return_value=sales_df):
        with patch("app.ml.training.retrain_job.load_tenant_model", return_value=(current_model, "v1")):
            with patch("app.ml.training.retrain_job.run_tenant_training", return_value=(new_model, "v2")):
                with patch("app.ml.training.retrain_job.save_tenant_model") as save_mock:
                    tracker = AccuracyTracker()
                    loop = __import__("asyncio").get_running_loop()
                    result = await run_retrain_for_tenant(TENANT_ID, tracker, loop)

    assert result.deployed is False
    assert result.rollback is True
    save_mock.assert_not_called()


@pytest.mark.asyncio
async def test_run_retrain_for_tenant_no_sales_skips():
    """When tenant has no sales, we skip (no deploy, no rollback)."""
    with patch("app.ml.training.retrain_job.load_sales_for_tenant_async", new_callable=AsyncMock, return_value=pd.DataFrame(columns=["date", "quantity"])):
        tracker = AccuracyTracker()
        loop = __import__("asyncio").get_running_loop()
        result = await run_retrain_for_tenant(TENANT_ID, tracker, loop)
    assert result.deployed is False
    assert result.rollback is False
    assert result.data_points == 0


def test_retrain_job_summary_to_log_dict():
    s = RetrainJobSummary(total_tenants=5, deployed=2, rollback=1, skipped_no_data=1, failed=1, duration_seconds=12.34)
    d = s.to_log_dict()
    assert d["total_tenants"] == 5
    assert d["deployed"] == 2
    assert d["rollback"] == 1
    assert d["skipped_no_data"] == 1
    assert d["failed"] == 1
    assert d["duration_seconds"] == 12.34
