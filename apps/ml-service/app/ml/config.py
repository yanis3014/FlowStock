"""
MLflow and ML configuration.
Epic 5 Story 5.1 - Infrastructure ML & Modèles de base.
"""
import os
from pathlib import Path


def get_mlflow_tracking_uri() -> str:
    """Return MLflow tracking URI (local directory or remote server).
    On local filesystem, returns a proper file:// URI for cross-platform compat.
    """
    env_uri = os.getenv("MLFLOW_TRACKING_URI")
    if env_uri:
        return env_uri
    # Default: local mlruns directory with file:// URI (required on Windows)
    local_path = Path(__file__).resolve().parents[2] / "mlruns"
    return local_path.as_uri()


def get_mlflow_experiment_name() -> str:
    """Return MLflow experiment name for stock predictions."""
    return os.getenv("MLFLOW_EXPERIMENT_NAME", "stock-predictions")


def ensure_mlflow_experiment():
    """Ensure MLflow client is configured with tracking URI and experiment."""
    import mlflow
    uri = get_mlflow_tracking_uri()
    mlflow.set_tracking_uri(uri)
    exp_name = get_mlflow_experiment_name()
    mlflow.set_experiment(exp_name)
