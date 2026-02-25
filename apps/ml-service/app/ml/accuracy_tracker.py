"""
Accuracy/precision tracking over time for longitudinal monitoring.
Computes error metrics on known data and tracks evolution across training sessions.

Epic 5 Story 5.2 - Task 5: Amélioration précision au fil du temps.
"""
import logging
import time
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from app.ml.models.baseline import BaselineConsumptionModel

logger = logging.getLogger("bmad.ml.accuracy_tracker")


@dataclass
class AccuracySnapshot:
    """A snapshot of model accuracy at a point in time."""

    timestamp: float  # unix timestamp
    mae: float  # Mean Absolute Error
    rmse: float  # Root Mean Squared Error
    mape: Optional[float]  # Mean Absolute Percentage Error (None if zeros in actual)
    r_squared: float  # R² score on known data
    data_points: int  # number of data points evaluated
    model_version: str
    tenant_id: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AccuracyEvolution:
    """Longitudinal view of accuracy over multiple snapshots."""

    snapshots: List[AccuracySnapshot] = field(default_factory=list)
    improving: bool = False  # True if latest error < first error
    trend_direction: str = "stable"  # "improving", "degrading", "stable"

    def to_dict(self) -> dict:
        return {
            "snapshots": [s.to_dict() for s in self.snapshots],
            "improving": self.improving,
            "trend_direction": self.trend_direction,
            "total_snapshots": len(self.snapshots),
        }


# Maximum snapshots kept per tenant (FIFO eviction to avoid unbounded memory growth)
MAX_SNAPSHOTS_PER_TENANT = 500


class AccuracyTracker:
    """
    Track model accuracy over time for longitudinal monitoring.

    Stores accuracy snapshots after each training/evaluation session.
    Provides metrics indicating if precision improves or degrades.
    At most MAX_SNAPSHOTS_PER_TENANT snapshots are kept per tenant (oldest evicted first).
    """

    def __init__(self, max_snapshots_per_tenant: int = MAX_SNAPSHOTS_PER_TENANT):
        self._snapshots: Dict[str, List[AccuracySnapshot]] = {}  # key: tenant_id or "global"
        self._max_snapshots = max_snapshots_per_tenant

    def evaluate_accuracy(
        self,
        model: BaselineConsumptionModel,
        actual_data: pd.DataFrame,
        model_version: str = "unknown",
        tenant_id: Optional[str] = None,
    ) -> AccuracySnapshot:
        """
        Evaluate model accuracy on known data and record a snapshot.

        Args:
            model: The model to evaluate.
            actual_data: DataFrame with [date, quantity] columns (known actuals).
            model_version: Version string for tracking.
            tenant_id: Tenant identifier (None for global model).

        Returns:
            AccuracySnapshot with error metrics.
        """
        if actual_data is None or len(actual_data) == 0:
            snapshot = AccuracySnapshot(
                timestamp=time.time(),
                mae=0.0,
                rmse=0.0,
                mape=None,
                r_squared=0.0,
                data_points=0,
                model_version=model_version,
                tenant_id=tenant_id,
            )
            self._store_snapshot(tenant_id, snapshot)
            return snapshot

        # Prepare data
        df = _prepare_data(actual_data)
        n = len(df)
        y_actual = df["quantity"].values.astype(float)

        # Generate predictions using model's daily_consumption
        # The baseline model predicts a constant consumption rate
        y_predicted = np.full(n, model.daily_consumption)

        # Compute error metrics
        errors = y_actual - y_predicted
        mae = float(np.mean(np.abs(errors)))
        rmse = float(np.sqrt(np.mean(errors ** 2)))

        # MAPE (avoid division by zero)
        if np.all(y_actual != 0):
            mape = float(np.mean(np.abs(errors / y_actual)) * 100)
        else:
            mape = None

        # R² score
        ss_res = float(np.sum(errors ** 2))
        ss_tot = float(np.sum((y_actual - np.mean(y_actual)) ** 2))
        r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        snapshot = AccuracySnapshot(
            timestamp=time.time(),
            mae=round(mae, 4),
            rmse=round(rmse, 4),
            mape=round(mape, 2) if mape is not None else None,
            r_squared=round(r_squared, 4),
            data_points=n,
            model_version=model_version,
            tenant_id=tenant_id,
        )

        self._store_snapshot(tenant_id, snapshot)

        logger.info(
            "Accuracy snapshot: tenant=%s, version=%s, MAE=%.4f, RMSE=%.4f, "
            "MAPE=%s, R²=%.4f, n=%d",
            tenant_id or "global", model_version, mae, rmse,
            f"{mape:.2f}%" if mape is not None else "N/A",
            r_squared, n,
        )

        return snapshot

    def get_evolution(self, tenant_id: Optional[str] = None) -> AccuracyEvolution:
        """
        Get the longitudinal accuracy evolution for a tenant (or global).

        Returns:
            AccuracyEvolution with all snapshots and improvement assessment.
        """
        key = tenant_id or "global"
        snapshots = self._snapshots.get(key, [])

        if len(snapshots) < 2:
            return AccuracyEvolution(
                snapshots=list(snapshots),
                improving=False,
                trend_direction="stable",
            )

        # Determine improvement trend from MAE
        first_mae = snapshots[0].mae
        last_mae = snapshots[-1].mae

        if last_mae < first_mae * 0.95:  # 5% improvement threshold
            trend = "improving"
            improving = True
        elif last_mae > first_mae * 1.05:
            trend = "degrading"
            improving = False
        else:
            trend = "stable"
            improving = False

        return AccuracyEvolution(
            snapshots=list(snapshots),
            improving=improving,
            trend_direction=trend,
        )

    def get_latest_snapshot(self, tenant_id: Optional[str] = None) -> Optional[AccuracySnapshot]:
        """Get the most recent accuracy snapshot."""
        key = tenant_id or "global"
        snapshots = self._snapshots.get(key, [])
        return snapshots[-1] if snapshots else None

    def reset(self, tenant_id: Optional[str] = None) -> None:
        """Clear snapshots for a tenant (or global)."""
        key = tenant_id or "global"
        self._snapshots.pop(key, None)

    def _store_snapshot(self, tenant_id: Optional[str], snapshot: AccuracySnapshot) -> None:
        key = tenant_id or "global"
        if key not in self._snapshots:
            self._snapshots[key] = []
        lst = self._snapshots[key]
        lst.append(snapshot)
        # Evict oldest snapshots when over limit
        while len(lst) > self._max_snapshots:
            lst.pop(0)


def _prepare_data(data: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare daily aggregated data.
    Expects a DataFrame with columns 'date' and 'quantity' (or first two columns
    treated as date, quantity). Raises ValueError if required columns are missing
    or data has fewer than two columns.
    """
    if data is None or len(data) == 0:
        return pd.DataFrame(columns=["date", "quantity"])
    if "date" in data.columns and "quantity" in data.columns:
        df = data[["date", "quantity"]].copy()
    else:
        if len(data.columns) < 2:
            raise ValueError(
                "actual_data must have columns 'date' and 'quantity', or at least two columns "
                "(first: date, second: quantity)"
            )
        df = data.iloc[:, :2].copy()
        df.columns = ["date", "quantity"]
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    return df.groupby("date")["quantity"].sum().reset_index().sort_values("date").reset_index(drop=True)
