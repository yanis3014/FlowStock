"""
Training pipeline: load sales data, preprocess, train, log to MLflow, save artifact.
Epic 5 Story 5.1 - Infrastructure ML & Modèles de base.
"""
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd
import mlflow
from app.ml.config import ensure_mlflow_experiment
from app.ml.models.baseline import BaselineConsumptionModel


def run_training_pipeline(
    tenant_id: Optional[str] = None,
    sales_data: Optional[pd.DataFrame] = None,
    model_version: Optional[str] = None,
) -> tuple[BaselineConsumptionModel, str]:
    """
    Run the training pipeline: preprocess, train, log to MLflow, save model artifact.

    Args:
        tenant_id: Tenant ID for isolation (NFR16). If None, trains a global baseline.
        sales_data: DataFrame with columns at least [date, quantity] or similar.
                    If None, creates a default baseline without training.
        model_version: Optional version string (e.g. semver or timestamp).

    Returns:
        (trained_model, version_string).
    """
    ensure_mlflow_experiment()
    if model_version is None:
        import time
        model_version = str(int(time.time()))

    with mlflow.start_run(run_name=f"baseline_{tenant_id or 'global'}_{model_version}"):
        mlflow.log_param("tenant_id", tenant_id or "global")
        mlflow.log_param("model_type", "BaselineConsumption")

        if sales_data is not None and len(sales_data) > 0:
            # Preprocess: aggregate by day if needed, then fit
            if "date" in sales_data.columns and "quantity" in sales_data.columns:
                df = sales_data[["date", "quantity"]].copy()
            else:
                df = sales_data.iloc[:, :2].rename(columns={sales_data.columns[0]: "date", sales_data.columns[1]: "quantity"})
            df["date"] = pd.to_datetime(df["date"]).dt.normalize()
            daily = df.groupby("date")["quantity"].sum().reset_index()
            if len(daily) < 2:
                model = BaselineConsumptionModel(daily_consumption=1.0)
            else:
                daily["day_idx"] = np.arange(len(daily))
                X = daily[["day_idx"]].values
                y = daily["quantity"].values
                model = BaselineConsumptionModel().fit(X, y)
                mlflow.log_metric("daily_consumption", model.daily_consumption)
        else:
            model = BaselineConsumptionModel(daily_consumption=1.0)
        mlflow.log_param("daily_consumption", model.daily_consumption)

        # Save artifact via registry (multi-version) and log to MLflow
        from app.ml.registry import save_model_version
        versioned_path = save_model_version(model, model_version)
        mlflow.log_artifact(str(versioned_path), artifact_path="model")
        mlflow.log_param("artifact_path", str(versioned_path))

        return model, model_version
