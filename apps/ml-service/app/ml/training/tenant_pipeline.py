"""
Tenant-aware training pipeline: fine-tune models per tenant_id.
Loads baseline or last tenant model, trains on tenant data, saves per-tenant.

Epic 5 Story 5.2 - Task 3: Fine-tuning par entreprise.
"""
import logging
import time
from typing import Optional

import mlflow
import numpy as np
import pandas as pd

from app.ml.config import ensure_mlflow_experiment
from app.ml.models.baseline import BaselineConsumptionModel
from app.ml.registry_tenant import load_tenant_model, save_tenant_model

logger = logging.getLogger("bmad.ml.training.tenant_pipeline")


def run_tenant_training(
    tenant_id: str,
    sales_data: pd.DataFrame,
    model_version: Optional[str] = None,
    base_model: Optional[BaselineConsumptionModel] = None,
    save_model: bool = True,
) -> tuple[BaselineConsumptionModel, str]:
    """
    Train/fine-tune a model for a specific tenant.

    Strategy:
    1. Load existing tenant model (if any) or use provided base_model or global baseline.
    2. Train on tenant sales data.
    3. Optionally save to tenant-specific registry (when save_model=True).
    4. Log to MLflow.

    Args:
        tenant_id: Tenant identifier (UUID or string).
        sales_data: DataFrame with [date, quantity] columns.
        model_version: Version string. Auto-generated if None.
        base_model: Optional base model to fine-tune from.
        save_model: If True, persist model to registry. If False, return model without saving (e.g. for validation).

    Returns:
        (trained_model, version_string).
    """
    ensure_mlflow_experiment()

    if model_version is None:
        model_version = str(int(time.time()))

    # Step 1: Determine starting model
    existing_model, existing_version = load_tenant_model(tenant_id)
    if existing_model is not None:
        logger.info(
            "Fine-tuning from existing tenant model: tenant=%s, version=%s",
            tenant_id, existing_version,
        )
        model = existing_model
    elif base_model is not None:
        logger.info("Fine-tuning from provided base model for tenant=%s", tenant_id)
        model = base_model
    else:
        logger.info("Starting from default baseline for tenant=%s", tenant_id)
        model = BaselineConsumptionModel(daily_consumption=1.0)

    # Step 2: Train on tenant data
    with mlflow.start_run(run_name=f"tenant_{tenant_id}_{model_version}"):
        mlflow.log_param("tenant_id", tenant_id)
        mlflow.log_param("model_type", "BaselineConsumption_TenantFineTune")
        mlflow.log_param("base_version", existing_version or "default")

        if sales_data is not None and len(sales_data) > 0:
            df = _prepare_tenant_data(sales_data)
            if len(df) >= 1:
                y = df["quantity"].values.astype(float)
                # For tenant fine-tuning, use mean daily quantity as consumption rate
                # This is more meaningful than slope for stock-out predictions
                mean_consumption = float(np.mean(y))
                model = BaselineConsumptionModel(daily_consumption=max(1e-6, mean_consumption))
                # Also fit the regression for trend tracking
                if len(df) >= 2:
                    X = np.arange(len(df), dtype=float).reshape(-1, 1)
                    model.fit(X, y)
                    # Override with mean consumption (fit sets slope as consumption)
                    model.daily_consumption = max(1e-6, mean_consumption)
                mlflow.log_metric("daily_consumption", model.daily_consumption)
                mlflow.log_metric("training_samples", len(df))
                mlflow.log_metric("mean_daily_quantity", mean_consumption)
            else:
                mlflow.log_metric("training_samples", 0)
        else:
            mlflow.log_metric("training_samples", 0)

        mlflow.log_param("daily_consumption", model.daily_consumption)

        # Step 3: Save to tenant registry (optional, e.g. skip when validating before deploy)
        if save_model:
            versioned_path = save_tenant_model(model, tenant_id, model_version)
            mlflow.log_artifact(str(versioned_path), artifact_path="model")
            mlflow.log_param("artifact_path", str(versioned_path))
        else:
            mlflow.log_param("artifact_path", "(not saved)")

        logger.info(
            "Tenant training complete: tenant=%s, version=%s, consumption=%.4f",
            tenant_id, model_version, model.daily_consumption,
        )

        return model, model_version


def _prepare_tenant_data(sales_data: pd.DataFrame) -> pd.DataFrame:
    """Prepare daily aggregated sales data for tenant training."""
    if "date" in sales_data.columns and "quantity" in sales_data.columns:
        df = sales_data[["date", "quantity"]].copy()
    else:
        df = sales_data.iloc[:, :2].copy()
        df.columns = ["date", "quantity"]

    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    daily = df.groupby("date")["quantity"].sum().reset_index().sort_values("date")
    return daily.reset_index(drop=True)
