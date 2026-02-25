"""
Daily retrain job: load sales per tenant, train, validate vs current model, deploy or rollback.
Story 5.4: Réentraînement automatique quotidien.
"""
import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import List, Optional

import pandas as pd

from app.ml.accuracy_tracker import AccuracyTracker
from app.ml.models.baseline import BaselineConsumptionModel
from app.ml.registry_tenant import load_tenant_model, save_tenant_model
from app.ml.training.sales_loader import get_active_tenant_ids, load_sales_for_tenant_async
from app.ml.training.tenant_pipeline import run_tenant_training

logger = logging.getLogger("bmad.ml.training.retrain_job")

# Max relative MAE increase allowed (1.05 = 5% degradation) before we rollback
DEGRADATION_THRESHOLD = float(os.getenv("RETRAIN_DEGRADATION_THRESHOLD", "1.05"))
# Process N tenants at a time (1 = sequential to limit CPU/memory)
BATCH_SIZE = int(os.getenv("RETRAIN_BATCH_SIZE", "1"))


@dataclass
class RetrainResult:
    tenant_id: str
    deployed: bool  # True if new model was saved
    rollback: bool  # True if new model was worse, kept previous
    duration_seconds: float = 0.0
    current_mae: Optional[float] = None
    new_mae: Optional[float] = None
    model_version: str = ""
    data_points: int = 0
    error: Optional[str] = None


@dataclass
class RetrainJobSummary:
    total_tenants: int = 0
    deployed: int = 0
    rollback: int = 0
    skipped_no_data: int = 0
    failed: int = 0
    duration_seconds: float = 0.0
    results: List[RetrainResult] = field(default_factory=list)

    def to_log_dict(self) -> dict:
        return {
            "total_tenants": self.total_tenants,
            "deployed": self.deployed,
            "rollback": self.rollback,
            "skipped_no_data": self.skipped_no_data,
            "failed": self.failed,
            "duration_seconds": round(self.duration_seconds, 2),
        }


def _run_tenant_training_sync(
    tenant_id: str,
    sales_data: pd.DataFrame,
    model_version: Optional[str],
    save_model: bool,
) -> tuple[BaselineConsumptionModel, str]:
    """Sync bridge for run_tenant_training (called from async via run_in_executor)."""
    return run_tenant_training(
        tenant_id=tenant_id,
        sales_data=sales_data,
        model_version=model_version,
        base_model=None,
        save_model=save_model,
    )


async def run_retrain_for_tenant(
    tenant_id: str,
    accuracy_tracker: AccuracyTracker,
    loop: asyncio.AbstractEventLoop,
) -> RetrainResult:
    """
    Load sales, train new model (without saving), compare to current, deploy or rollback.
    """
    start = time.perf_counter()
    result = RetrainResult(tenant_id=tenant_id, deployed=False, rollback=False)

    try:
        sales_df = await load_sales_for_tenant_async(tenant_id)
        result.data_points = len(sales_df) if sales_df is not None else 0

        if sales_df is None or len(sales_df) == 0:
            logger.info("Retrain tenant=%s: no sales data, skip", tenant_id)
            result.duration_seconds = time.perf_counter() - start
            return result

        # Load current model for comparison
        current_model, current_version = load_tenant_model(tenant_id)
        if current_model is None:
            current_model = BaselineConsumptionModel(daily_consumption=1.0)
            current_version = "baseline"

        # Train new model without saving
        new_model, new_version = await loop.run_in_executor(
            None,
            lambda: _run_tenant_training_sync(
                tenant_id, sales_df, model_version=None, save_model=False
            ),
        )
        result.model_version = new_version

        # Evaluate both on same data
        current_snap = accuracy_tracker.evaluate_accuracy(
            current_model, sales_df, model_version=current_version, tenant_id=tenant_id
        )
        new_snap = accuracy_tracker.evaluate_accuracy(
            new_model, sales_df, model_version=new_version, tenant_id=tenant_id
        )
        result.current_mae = current_snap.mae
        result.new_mae = new_snap.mae

        # Deploy if new model not worse than threshold (allow small degradation)
        threshold_mae = current_snap.mae * DEGRADATION_THRESHOLD
        if new_snap.mae <= threshold_mae:
            await loop.run_in_executor(
                None,
                lambda: save_tenant_model(new_model, tenant_id, new_version),
            )
            result.deployed = True
            logger.info(
                "Retrain tenant=%s: deployed version=%s, MAE %.4f -> %.4f",
                tenant_id, new_version, current_snap.mae, new_snap.mae,
            )
        else:
            result.rollback = True
            logger.warning(
                "Retrain tenant=%s: rollback (new MAE %.4f > threshold %.4f), kept current",
                tenant_id, new_snap.mae, threshold_mae,
            )

    except Exception as e:
        logger.exception("Retrain tenant=%s failed: %s", tenant_id, e)
        result.error = str(e)
    finally:
        result.duration_seconds = time.perf_counter() - start

    return result


async def run_retrain_job(
    tenant_ids: Optional[List[str]] = None,
    batch_size: int = BATCH_SIZE,
) -> RetrainJobSummary:
    """
    Run the full retrain job: for each tenant (or provided list), load sales,
    train, validate, deploy or rollback. Logs duration and metrics per tenant.
    """
    summary = RetrainJobSummary()
    start = time.perf_counter()
    accuracy_tracker = AccuracyTracker()
    loop = asyncio.get_running_loop()

    if tenant_ids is None:
        tenant_ids = await get_active_tenant_ids()
    summary.total_tenants = len(tenant_ids)

    if not tenant_ids:
        logger.info("Retrain job: no tenants to process")
        summary.duration_seconds = time.perf_counter() - start
        return summary

    for i in range(0, len(tenant_ids), batch_size):
        batch = tenant_ids[i : i + batch_size]
        tasks = [
            run_retrain_for_tenant(tid, accuracy_tracker, loop)
            for tid in batch
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, Exception):
                summary.failed += 1
                summary.results.append(
                    RetrainResult(
                        tenant_id="(unknown)",
                        deployed=False,
                        rollback=False,
                        error=str(r),
                    )
                )
                logger.exception("Retrain task failed: %s", r)
                continue
            summary.results.append(r)
            if r.error:
                summary.failed += 1
            elif r.data_points == 0 and not r.deployed and not r.rollback:
                summary.skipped_no_data += 1
            elif r.deployed:
                summary.deployed += 1
            elif r.rollback:
                summary.rollback += 1

    summary.duration_seconds = time.perf_counter() - start
    logger.info(
        "Retrain job complete: %s",
        summary.to_log_dict(),
    )
    return summary
