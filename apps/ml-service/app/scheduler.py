"""
Daily retrain job scheduler. Story 5.4.
Runs run_retrain_job at configurable hour (default 2am).
"""
import asyncio
import logging
import os
from typing import Any, Optional

logger = logging.getLogger("bmad.ml.scheduler")

_scheduler: Any = None


def _run_retrain_on_schedule(app: Any) -> None:
    """Called by APScheduler from its thread; runs async run_retrain_job on app loop."""
    loop: Optional[asyncio.AbstractEventLoop] = getattr(
        app.state, "loop", None
    )
    if not loop or not loop.is_running():
        logger.warning("Retrain job skipped: no running event loop on app.state")
        return
    from app.ml.training.retrain_job import run_retrain_job
    future = asyncio.run_coroutine_threadsafe(run_retrain_job(), loop)
    try:
        future.result(timeout=3600)  # max 1 hour
    except Exception as e:
        logger.exception("Retrain job failed: %s", e)


def start_scheduler(app: Any) -> None:
    """Start APScheduler with daily retrain job at RETRAIN_DAILY_HOUR (default 2)."""
    global _scheduler
    if _scheduler is not None:
        return
    from apscheduler.schedulers.background import BackgroundScheduler
    hour = int(os.getenv("RETRAIN_DAILY_HOUR", "2"))
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _run_retrain_on_schedule,
        "cron",
        hour=hour,
        minute=0,
        args=[app],
        id="daily_retrain",
    )
    _scheduler.start()
    logger.info("Retrain scheduler started: daily at %s:00", hour)


def stop_scheduler() -> None:
    """Stop the scheduler (on app shutdown)."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Retrain scheduler stopped")
