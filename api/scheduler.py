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
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from api import snapshot
from model.run_forecast import LATEST_RISK, run
from pipeline.config import RAIN_DIR
from pipeline.config import TIMEZONE

log = logging.getLogger("agrim.scheduler")
FORECAST_CSV = RAIN_DIR / "forecast" / "latest.csv"
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


FETCH_COOLDOWN_S = 15 * 60   # after a refused fetch, wait before asking Open-Meteo again
_last_fetch_failure = {"t": 0.0}


def fetch_cooling_down() -> bool:
    return time.monotonic() - _last_fetch_failure["t"] < FETCH_COOLDOWN_S


def run_now(fetch: bool = True, reason: str = "") -> dict | None:
    """Run the forecast unless another run is going (or a recent fetch was refused).

    On success the result is also saved to the database (api/snapshot.py), so
    a restarted server can restore it. Returns the result, or None.
    """
    if fetch and fetch_cooling_down():
        log.info("Skipping forecast fetch (%s): Open-Meteo refused recently", reason)
        return None
    if not run_lock.acquire(blocking=False):
        return None
    try:
        log.info("Forecast run (%s)", reason)
        result = run(fetch=fetch)
    except Exception:  # keep the scheduler alive; the last good result stays served
        log.exception("Forecast run failed")
        if fetch:
            _last_fetch_failure["t"] = time.monotonic()
        return None
    finally:
        run_lock.release()
    try:
        snapshot.push()
    except Exception:
        log.exception("Could not save the forecast snapshot")
    return result


def ensure_forecast() -> dict | None:
    """The current forecast: local files, else the database copy, else a fresh run."""
    snapshot.pull_if_due()           # a newer copy may have come from GitHub Actions
    result = latest()
    if result is None:
        try:
            snapshot.pull()
        except Exception:
            log.exception("Could not restore the forecast snapshot")
        result = latest()
    if result is None:
        result = run_now(fetch=not FORECAST_CSV.exists(), reason="first request")
    return result


def hourly_tick():
    snapshot.pull_if_due()
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
    try:
        snapshot.pull()              # a fresh server starts from the last saved forecast
    except Exception:
        log.exception("Could not restore the forecast snapshot")
    if age_hours(latest()) > STALE_HOURS:
        sched.add_job(run_now, kwargs={"reason": "startup"}, id="startup_run")
    sched.start()
    log.info("Scheduler on: runs at %s:05 IST, hourly in storm mode", sorted(REGULAR_HOURS))
    return sched
