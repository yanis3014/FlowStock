"""
ML module for predictions, training pipeline, and model registry.
Epic 5 Story 5.1 - Infrastructure ML & Modèles de base.
"""
from app.ml.config import get_mlflow_tracking_uri, get_mlflow_experiment_name

__all__ = ["get_mlflow_tracking_uri", "get_mlflow_experiment_name"]
