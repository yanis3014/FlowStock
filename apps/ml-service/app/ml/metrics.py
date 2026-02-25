"""
Simple in-memory metrics for ML inference (latency, errors, resources). Epic 5.1.
Thread-safe via threading.Lock.
"""
import logging
import threading
import time
from typing import Optional

logger = logging.getLogger("bmad.ml.metrics")

_lock = threading.Lock()
_last_inference_latency_ms: Optional[float] = None
_last_inference_error: Optional[str] = None
_inference_count: int = 0
_error_count: int = 0


def record_inference_latency_ms(latency_ms: float) -> None:
    global _last_inference_latency_ms, _inference_count
    with _lock:
        _last_inference_latency_ms = latency_ms
        _inference_count += 1


def record_inference_error(message: str) -> None:
    global _last_inference_error, _error_count
    with _lock:
        _last_inference_error = message
        _error_count += 1
    logger.error("ML inference error: %s", message)


def get_metrics() -> dict:
    with _lock:
        metrics = {
            "last_inference_latency_ms": _last_inference_latency_ms,
            "last_error": _last_inference_error,
            "inference_count": _inference_count,
            "error_count": _error_count,
        }
    # Resource metrics (CPU/memory) — M1 fix
    try:
        import psutil
        proc = psutil.Process()
        mem = proc.memory_info()
        metrics["memory_rss_mb"] = round(mem.rss / (1024 * 1024), 2)
        metrics["cpu_percent"] = proc.cpu_percent(interval=None)
    except ImportError:
        logger.debug("psutil not installed; resource metrics unavailable")
    except Exception as exc:
        logger.warning("Failed to collect resource metrics: %s", exc)
    return metrics


def reset_metrics() -> None:
    global _last_inference_latency_ms, _last_inference_error, _inference_count, _error_count
    with _lock:
        _last_inference_latency_ms = None
        _last_inference_error = None
        _inference_count = 0
        _error_count = 0
