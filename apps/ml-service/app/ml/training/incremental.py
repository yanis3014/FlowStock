"""
Incremental (progressive) learning: update model from new daily sales
without full retraining. Uses SGDRegressor.partial_fit() for online updates
and a rolling data buffer for light batch retrains.

Epic 5 Story 5.2 - Task 2: Apprentissage progressif.
"""
import logging
import time
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import SGDRegressor

from app.ml.models.baseline import BaselineConsumptionModel

logger = logging.getLogger("bmad.ml.training.incremental")

# Maximum rolling window size (days) for the data buffer
_MAX_BUFFER_SIZE = 90

# Threshold below which we do a full retrain on the buffer
_FULL_RETRAIN_THRESHOLD = 30


@dataclass
class IncrementalUpdateResult:
    """Result of an incremental model update."""

    daily_consumption_before: float
    daily_consumption_after: float
    update_type: str  # "partial_fit" or "full_retrain"
    new_data_points: int
    total_buffer_points: int
    update_count: int  # how many times the model has been updated

    def to_dict(self) -> dict:
        return {
            "daily_consumption_before": self.daily_consumption_before,
            "daily_consumption_after": self.daily_consumption_after,
            "update_type": self.update_type,
            "new_data_points": self.new_data_points,
            "total_buffer_points": self.total_buffer_points,
            "update_count": self.update_count,
        }


class IncrementalTrainer:
    """
    Supports incremental model updates from new daily sales data.

    Uses two strategies:
    - **full_retrain**: When buffer has < 30 days, retrain from all buffered data.
    - **partial_fit**: When buffer has >= 30 days, use SGDRegressor.partial_fit()
      for online incremental updates (no full retraining).

    The rolling data buffer is capped at 90 days to keep updates fast.
    """

    def __init__(
        self,
        model: Optional[BaselineConsumptionModel] = None,
        max_buffer_size: int = _MAX_BUFFER_SIZE,
    ):
        self._model = model or BaselineConsumptionModel(daily_consumption=1.0)
        self._sgd: Optional[SGDRegressor] = None
        self._data_buffer: List[Tuple[float, float]] = []  # (day_idx, quantity)
        self._max_buffer_size = max_buffer_size
        self._update_count = 0
        self._base_day_offset = 0  # offset for day indexing across updates

    @property
    def model(self) -> BaselineConsumptionModel:
        """Current model state."""
        return self._model

    @property
    def update_count(self) -> int:
        """Number of incremental updates performed."""
        return self._update_count

    @property
    def buffer_size(self) -> int:
        """Current number of data points in the rolling buffer."""
        return len(self._data_buffer)

    def initialize_from_data(self, sales_data: pd.DataFrame) -> None:
        """
        Initialize the trainer buffer from historical sales data.
        Keeps only the last max_buffer_size days.

        Args:
            sales_data: DataFrame with columns [date, quantity].
        """
        if sales_data is None or len(sales_data) == 0:
            return

        df = _prepare_daily_data(sales_data)
        if len(df) == 0:
            return

        # Keep only last max_buffer_size days
        if len(df) > self._max_buffer_size:
            df = df.tail(self._max_buffer_size).reset_index(drop=True)

        # Populate buffer
        self._data_buffer = list(zip(range(len(df)), df["quantity"].tolist()))
        self._base_day_offset = len(df)

        logger.info(
            "Initialized incremental trainer with %d data points", len(self._data_buffer)
        )

    def update(self, new_sales: pd.DataFrame) -> IncrementalUpdateResult:
        """
        Update model incrementally with new daily sales data.

        Args:
            new_sales: DataFrame with columns [date, quantity] for new days.

        Returns:
            IncrementalUpdateResult with update metrics.
        """
        daily_consumption_before = self._model.daily_consumption

        # Prepare new data
        df = _prepare_daily_data(new_sales)
        if len(df) == 0:
            return IncrementalUpdateResult(
                daily_consumption_before=daily_consumption_before,
                daily_consumption_after=daily_consumption_before,
                update_type="no_update",
                new_data_points=0,
                total_buffer_points=len(self._data_buffer),
                update_count=self._update_count,
            )

        # Add new data to buffer with increasing day indices
        new_points = []
        for i, qty in enumerate(df["quantity"].tolist()):
            day_idx = self._base_day_offset + i
            new_points.append((float(day_idx), float(qty)))
        self._data_buffer.extend(new_points)
        self._base_day_offset += len(df)

        # Trim buffer to max size (keep most recent)
        if len(self._data_buffer) > self._max_buffer_size:
            self._data_buffer = self._data_buffer[-self._max_buffer_size:]

        # Choose update strategy
        if len(self._data_buffer) < _FULL_RETRAIN_THRESHOLD:
            update_type = self._full_retrain()
        else:
            update_type = self._partial_fit_update(new_points)

        self._update_count += 1

        result = IncrementalUpdateResult(
            daily_consumption_before=daily_consumption_before,
            daily_consumption_after=self._model.daily_consumption,
            update_type=update_type,
            new_data_points=len(df),
            total_buffer_points=len(self._data_buffer),
            update_count=self._update_count,
        )

        logger.info(
            "Incremental update #%d: %s, consumption %.4f → %.4f, "
            "+%d points (buffer=%d)",
            self._update_count,
            update_type,
            daily_consumption_before,
            self._model.daily_consumption,
            len(df),
            len(self._data_buffer),
        )

        return result

    def _full_retrain(self) -> str:
        """Full retrain on buffer data (light batch for small datasets)."""
        if len(self._data_buffer) < 2:
            return "full_retrain"

        X = np.array([p[0] for p in self._data_buffer]).reshape(-1, 1)
        y = np.array([p[1] for p in self._data_buffer])

        self._model.fit(X, y)

        # Also initialize SGD for future partial_fit calls
        self._sgd = SGDRegressor(
            loss="squared_error",
            learning_rate="adaptive",
            eta0=0.01,
            max_iter=1,
            tol=None,
            warm_start=True,
        )
        self._sgd.fit(X, y)

        return "full_retrain"

    def _partial_fit_update(self, new_points: List[Tuple[float, float]]) -> str:
        """Incremental update using SGDRegressor.partial_fit()."""
        X_new = np.array([p[0] for p in new_points]).reshape(-1, 1)
        y_new = np.array([p[1] for p in new_points])

        if self._sgd is None:
            # First time: initialize SGD from full buffer
            X_all = np.array([p[0] for p in self._data_buffer]).reshape(-1, 1)
            y_all = np.array([p[1] for p in self._data_buffer])
            self._sgd = SGDRegressor(
                loss="squared_error",
                learning_rate="adaptive",
                eta0=0.01,
                max_iter=1,
                tol=None,
                warm_start=True,
            )
            self._sgd.fit(X_all, y_all)
        else:
            # Incremental update: partial_fit with new data only
            self._sgd.partial_fit(X_new, y_new)

        # Update the baseline model's daily_consumption from SGD slope
        if hasattr(self._sgd, "coef_") and self._sgd.coef_ is not None:
            new_consumption = max(1e-6, float(np.abs(self._sgd.coef_[0])))
            self._model.daily_consumption = new_consumption

        return "partial_fit"


def _prepare_daily_data(sales_data: pd.DataFrame) -> pd.DataFrame:
    """Prepare daily aggregated data from raw sales DataFrame."""
    if sales_data is None or len(sales_data) == 0:
        return pd.DataFrame(columns=["date", "quantity"])

    if "date" in sales_data.columns and "quantity" in sales_data.columns:
        df = sales_data[["date", "quantity"]].copy()
    else:
        df = sales_data.iloc[:, :2].copy()
        df.columns = ["date", "quantity"]

    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    daily = df.groupby("date")["quantity"].sum().reset_index().sort_values("date")
    return daily.reset_index(drop=True)
