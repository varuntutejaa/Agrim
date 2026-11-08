"""Background forecast runs (APScheduler).

  - Twice a day (05:05 and 17:05 IST): fetch a fresh forecast and re-score.
  - Storm mode: while any hotspot is Red or Amber (next 24 h or day 2),
    re-run every hour instead.
  - On startup: run once if there is no result yet or it is over 12 h old.

Turned on with SCHEDULER=on in .env (leave off during local development,
because uvicorn --reload would start a second copy on every code change).
"""
import json
import logging
import os
import threading
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from model.run_forecast import LATEST_RISK, run
from pipeline.config import TIMEZONE

log = logging.getLogger("agrim.scheduler")
REGULAR_HOURS = {5, 17}
STALE_HOURS = 12

# One run at a time, whether it comes from the scheduler or POST /forecast/run.
run_lock = threading.Lock()


def latest() -> dict | None:
    return json.loads(LATEST_RISK.read_text()) if LATEST_RISK.exists() else None


def storm_mode(result: dict | None) -> bool:
    """True if any scored hotspot is Red or Amber in either window."""
    if not result:
        return False
    return any(r["scored"] and any(w["level"] != "green" for w in r["windows"].values())
               for r in result["hotspots"])


def age_hours(result: dict | None) -> float:
    if not result:
        return float("inf")
    generated = datetime.fromisoformat(result["meta"]["generated_at"])
    return (datetime.now(ZoneInfo(TIMEZONE)) - generated).total_seconds() / 3600


def run_now(fetch: bool = True, reason: str = "") -> dict | None:
    """Run the forecast unless another run is already going. Returns the result or None if busy."""
    if not run_lock.acquire(blocking=False):
        return None
    try:
        log.info("Forecast run (%s)", reason)
        return run(fetch=fetch)
    except Exception:  # keep the scheduler alive; the last good result stays served
        log.exception("Forecast run failed")
        return None
    finally:
        run_lock.release()


def hourly_tick():
    hour = datetime.now(ZoneInfo(TIMEZONE)).hour
    current = latest()
    if hour in REGULAR_HOURS:
        run_now(reason="twice-daily")
    elif storm_mode(current):
        run_now(reason="storm mode")


def start() -> BackgroundScheduler | None:
    if os.getenv("SCHEDULER", "off").lower() != "on":
        return None
    sched = BackgroundScheduler(timezone=TIMEZONE)
    sched.add_job(hourly_tick, "cron", minute=5, id="hourly_tick")
    if age_hours(latest()) > STALE_HOURS:
        sched.add_job(run_now, kwargs={"reason": "startup"}, id="startup_run")
    sched.start()
    log.info("Scheduler on: runs at %s:05 IST, hourly in storm mode", sorted(REGULAR_HOURS))
    return sched
