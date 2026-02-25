"""
Structured learning/training logger: logs training parameters, metrics,
duration, and tenant_id via MLflow and Python logging.

Epic 5 Story 5.2 - Task 6: Logs apprentissage pour debugging.
"""
import logging
import time
from contextlib import contextmanager
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger("bmad.ml.training.learning_logger")


@dataclass
class TrainingLogEntry:
    """A structured log entry for a training run."""

    run_id: str
    tenant_id: Optional[str]
    model_type: str
    model_version: str
    start_time: float
    end_time: float = 0.0
    duration_seconds: float = 0.0
    status: str = "pending"  # "pending", "running", "success", "failed"

    # Training parameters
    parameters: Dict[str, Any] = field(default_factory=dict)

    # Training metrics
    metrics: Dict[str, float] = field(default_factory=dict)

    # Data info
    data_points: int = 0
    data_date_range: str = ""

    # Error info (if failed)
    error_message: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


class LearningLogger:
    """
    Structured logger for ML training sessions.
    Logs to both Python logging and (optionally) MLflow.

    Provides a context manager for tracking training duration and status.
    """

    def __init__(self, use_mlflow: bool = True):
        self._entries: List[TrainingLogEntry] = []
        self._use_mlflow = use_mlflow

    @property
    def entries(self) -> List[TrainingLogEntry]:
        """All recorded log entries."""
        return list(self._entries)

    @property
    def entry_count(self) -> int:
        return len(self._entries)

    def get_entries_for_tenant(self, tenant_id: str) -> List[TrainingLogEntry]:
        """Filter entries by tenant_id."""
        return [e for e in self._entries if e.tenant_id == tenant_id]

    def get_latest_entry(self) -> Optional[TrainingLogEntry]:
        """Get the most recent log entry."""
        return self._entries[-1] if self._entries else None

    @contextmanager
    def track_training(
        self,
        run_id: str,
        tenant_id: Optional[str] = None,
        model_type: str = "BaselineConsumption",
        model_version: str = "unknown",
        parameters: Optional[Dict[str, Any]] = None,
        data_points: int = 0,
        data_date_range: str = "",
    ):
        """
        Context manager to track a training run.

        Usage:
            with logger.track_training("run-1", tenant_id="abc") as entry:
                # ... training code ...
                entry.metrics["mae"] = 0.5
                entry.data_points = 100

        Automatically records start/end time, duration, and status.
        """
        entry = TrainingLogEntry(
            run_id=run_id,
            tenant_id=tenant_id,
            model_type=model_type,
            model_version=model_version,
            start_time=time.time(),
            status="running",
            parameters=parameters or {},
            data_points=data_points,
            data_date_range=data_date_range,
        )

        logger.info(
            "Training started: run_id=%s, tenant=%s, model=%s, version=%s",
            run_id, tenant_id or "global", model_type, model_version,
        )

        if self._use_mlflow:
            self._log_mlflow_start(entry)

        try:
            yield entry
            entry.status = "success"
        except Exception as exc:
            entry.status = "failed"
            entry.error_message = str(exc)
            logger.error(
                "Training failed: run_id=%s, error=%s", run_id, exc,
            )
            raise
        finally:
            entry.end_time = time.time()
            entry.duration_seconds = round(entry.end_time - entry.start_time, 3)
            self._entries.append(entry)

            if self._use_mlflow:
                self._log_mlflow_end(entry)

            logger.info(
                "Training %s: run_id=%s, tenant=%s, duration=%.3fs, "
                "metrics=%s, data_points=%d",
                entry.status, run_id, tenant_id or "global",
                entry.duration_seconds, entry.metrics, entry.data_points,
            )

    def log_entry(self, entry: TrainingLogEntry) -> None:
        """Manually add a log entry (for batch imports or external logs)."""
        self._entries.append(entry)
        logger.info(
            "Training log added: run_id=%s, tenant=%s, status=%s",
            entry.run_id, entry.tenant_id or "global", entry.status,
        )

    def _log_mlflow_start(self, entry: TrainingLogEntry) -> None:
        """Log training start parameters to MLflow (if available)."""
        try:
            import mlflow
            from app.ml.config import ensure_mlflow_experiment
            ensure_mlflow_experiment()
            # Don't start a new run here; the training pipeline manages MLflow runs
            # Just log parameters if a run is active
            if mlflow.active_run():
                mlflow.log_param("learning_log_run_id", entry.run_id)
                mlflow.log_param("learning_log_tenant", entry.tenant_id or "global")
                for k, v in entry.parameters.items():
                    try:
                        mlflow.log_param(f"ll_{k}", v)
                    except Exception:
                        pass
        except ImportError:
            pass
        except Exception as exc:
            logger.debug("MLflow logging skipped: %s", exc)

    def _log_mlflow_end(self, entry: TrainingLogEntry) -> None:
        """Log training end metrics to MLflow (if available)."""
        try:
            import mlflow
            if mlflow.active_run():
                mlflow.log_metric("learning_log_duration_s", entry.duration_seconds)
                mlflow.log_metric("learning_log_data_points", entry.data_points)
                for k, v in entry.metrics.items():
                    try:
                        mlflow.log_metric(f"ll_{k}", v)
                    except Exception:
                        pass
        except ImportError:
            pass
        except Exception as exc:
            logger.debug("MLflow metric logging skipped: %s", exc)

    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of all training runs.
        Useful for debugging and monitoring.
        """
        total = len(self._entries)
        successes = sum(1 for e in self._entries if e.status == "success")
        failures = sum(1 for e in self._entries if e.status == "failed")
        avg_duration = (
            sum(e.duration_seconds for e in self._entries) / total
            if total > 0
            else 0.0
        )

        tenants = set(e.tenant_id for e in self._entries if e.tenant_id)

        return {
            "total_runs": total,
            "successes": successes,
            "failures": failures,
            "average_duration_seconds": round(avg_duration, 3),
            "unique_tenants": len(tenants),
            "tenant_ids": sorted(tenants),
        }
