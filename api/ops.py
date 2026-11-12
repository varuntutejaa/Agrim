"""MCG operations: officer overrides, post-event feedback, and the SOP checklist.

Overrides
  An officer can set a hotspot to Red/Amber/Green with a name and a reason.
  It applies until `valid_until` (default 24 h) and changes what everyone
  sees, including the public map, while the model's own call is kept and
  shown next to it. Exercise overrides (made on a simulation) never touch
  the live forecast, and live ones never touch exercises.

Feedback (T+24 h)
  Did the hotspot flood, how deep, for how long. It's stored with the level
  Agrim showed for that hotspot and day, so the scorecard (milestone 7) can
  count hits, misses and false alarms.

Checklist
  The SOP steps, ticked per forecast run: T-24 h list issued (per zone),
  T-12 h gullies cleared and pump moved, T-3 h pump tested (per hotspot).
"""
import glob
import json
import time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from api import db
from model import rules
from model.run_forecast import FORECAST_DIR, LEVEL_ORDER
from pipeline.config import TIMEZONE

IST = ZoneInfo(TIMEZONE)
LEVELS = ("red", "amber", "green")
DEPTHS = ("ankle", "knee", "waist", "unknown")
CHECK_ITEMS = ("list_issued", "gullies_cleared", "pump_moved", "pump_tested")
EXERCISE_RUN = "exercise"


def now() -> datetime:
    return datetime.now(IST)


def _clean(text: str | None, limit: int) -> str:
    """Strip control characters and trim to `limit` characters."""
    return " ".join((text or "").replace("\x00", "").split())[:limit]


class OpsError(ValueError):
    """Bad input from the form; shown to the officer as is."""


# --- Overrides ----------------------------------------------------------------------

def create_override(officer: str, hotspot_id: str, new_level: str, reason: str, valid_hours: float,
                    is_exercise: bool, model_level: str | None, run_id: str | None, known_ids: set) -> dict:
    officer, reason = _clean(officer, 80), _clean(reason, 500)
    if len(officer) < 2:
        raise OpsError("Enter your name (at least 2 characters).")
    if len(reason) < 10:
        raise OpsError("Give a reason of at least 10 characters, e.g. what you saw on the ground.")
    if new_level not in LEVELS:
        raise OpsError("Level must be red, amber or green.")
    if hotspot_id not in known_ids:
        raise OpsError("Unknown hotspot.")
    if not 1 <= valid_hours <= 72:
        raise OpsError("An override can last between 1 and 72 hours.")
    with db.connect() as conn:
        row = conn.execute(db.q(
            """INSERT INTO {overrides} (officer, hotspot_id, model_level, new_level, reason, valid_until, is_exercise, run_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *"""),
            (officer, hotspot_id, model_level, new_level, reason, now() + timedelta(hours=valid_hours),
             is_exercise, run_id),
        ).fetchone()
    _forget_active()
    return _jsonable(row)


def revoke_override(override_id: int, officer: str) -> dict:
    officer = _clean(officer, 80)
    if len(officer) < 2:
        raise OpsError("Enter your name to cancel an override.")
    with db.connect() as conn:
        row = conn.execute(
            db.q("UPDATE {overrides} SET revoked_at = now(), revoked_by = %s WHERE id = %s AND revoked_at IS NULL RETURNING *"),
            (officer, override_id),
        ).fetchone()
    _forget_active()
    if row is None:
        raise OpsError("No active override with that id.")
    return _jsonable(row)


# Active overrides are read on every forecast request and every simulator
# slider move, and the database is a few hundred ms away, so they are cached
# briefly. Any change made through this server clears the cache at once.
_CACHE_SECONDS = 15
_active_cache: dict = {}


def _forget_active():
    _active_cache.clear()


def active_overrides(is_exercise: bool) -> dict:
    """Latest unexpired, unrevoked override per hotspot (cached for a few seconds)."""
    hit = _active_cache.get(is_exercise)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    result = _load_active(is_exercise)
    _active_cache[is_exercise] = (time.monotonic() + _CACHE_SECONDS, result)
    return result


def _load_active(is_exercise: bool) -> dict:
    with db.connect() as conn:
        found = conn.execute(
            db.q("""SELECT DISTINCT ON (hotspot_id) * FROM {overrides}
               WHERE is_exercise = %s AND revoked_at IS NULL AND valid_until > now()
               ORDER BY hotspot_id, created_at DESC"""),
            (is_exercise,),
        ).fetchall()
    return {r["hotspot_id"]: _jsonable(r) for r in found}


def public_overrides(limit: int = 100) -> list[dict]:
    """Live overrides for the public page: place, dates, change and reason; no officer names."""
    with db.connect() as conn:
        found = conn.execute(db.q(
            """SELECT id, created_at, hotspot_id, model_level, new_level, reason, valid_until, revoked_at
               FROM {overrides} WHERE NOT is_exercise ORDER BY created_at DESC LIMIT %s"""), (limit,)).fetchall()
    return [_jsonable(r) for r in found]


def override_log(limit: int = 50) -> list[dict]:
    with db.connect() as conn:
        found = conn.execute(db.q("SELECT * FROM {overrides} ORDER BY created_at DESC LIMIT %s"), (limit,)).fetchall()
    return [_jsonable(r) for r in found]


def apply_overrides(result: dict, is_exercise: bool) -> dict:
    """Set each overridden hotspot's level to the officer's, keeping the model's call alongside.

    Changes `result` in place (callers pass a fresh copy) and returns it.
    """
    if not db.configured():
        result["meta"]["overrides_available"] = False
        return result
    active = active_overrides(is_exercise)
    windows_meta = result["meta"].get("windows", {})
    for h in result["hotspots"]:
        o = active.get(h["id"])
        if not h["scored"] or not o:
            continue
        for wname, w in h["windows"].items():
            start = windows_meta.get(wname, {}).get("start")
            # An override only covers windows that begin before it expires.
            if start and datetime.fromisoformat(start).replace(tzinfo=IST) >= datetime.fromisoformat(o["valid_until"]):
                continue
            w["model_level"] = w["level"]
            w["level"] = o["new_level"]
            w["action"] = rules.ACTIONS[o["new_level"]]
            w["override"] = {k: o[k] for k in ("id", "officer", "reason", "created_at", "valid_until", "model_level")}

    # Counts and order follow the final levels.
    for wname, counts in result["meta"]["counts"].items():
        for lvl in counts:
            counts[lvl] = sum(1 for h in result["hotspots"] if h["scored"] and h["windows"][wname]["level"] == lvl)
    first = next(iter(result["meta"]["counts"]))
    result["hotspots"].sort(key=lambda r: (not r["scored"],
                                           LEVEL_ORDER[r["windows"][first]["level"]] if r["scored"] else 3,
                                           -r["windows"][first]["score"] if r["scored"] else 0))
    result["meta"]["overrides_available"] = True
    return result


# --- Feedback --------------------------------------------------------------------

def predicted_level_for(hotspot_id: str, event_date: date) -> tuple[str | None, str | None]:
    """Level Agrim showed for this hotspot on that day: the last run before the day
    whose next-24 h window overlaps it. (None, None) if no archived run covers it."""
    day_start = datetime.combine(event_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    for path in sorted(glob.glob(str(FORECAST_DIR / "risk_*.json")), reverse=True):
        run = json.loads(open(path).read())
        win = run["meta"]["windows"]["next_24h"]
        start, end = datetime.fromisoformat(win["start"]), datetime.fromisoformat(win["end"])
        if start < day_end and end > day_start:
            for h in run["hotspots"]:
                if h["id"] == hotspot_id and h["scored"]:
                    return h["windows"]["next_24h"]["level"], run["meta"]["run_id"]
    return None, None


def create_feedback(officer: str, hotspot_id: str, event_date: str, flooded: bool, depth: str | None,
                    duration_hours: float | None, notes: str | None, known_ids: set) -> dict:
    officer = _clean(officer, 80)
    if len(officer) < 2:
        raise OpsError("Enter your name (at least 2 characters).")
    if hotspot_id not in known_ids:
        raise OpsError("Unknown hotspot.")
    try:
        day = date.fromisoformat(event_date)
    except ValueError:
        raise OpsError("Event date must be YYYY-MM-DD.")
    if day > now().date():
        raise OpsError("Event date can't be in the future.")
    depth = depth or ("unknown" if flooded else None)
    if depth is not None and depth not in DEPTHS:
        raise OpsError("Depth must be ankle, knee, waist or unknown.")
    if not flooded:
        depth = None
    if duration_hours is not None and not 0 <= duration_hours <= 240:
        raise OpsError("Duration must be between 0 and 240 hours.")
    predicted, run_id = predicted_level_for(hotspot_id, day)
    with db.connect() as conn:
        row = conn.execute(db.q(
            """INSERT INTO {feedback} (officer, hotspot_id, event_date, flooded, depth, duration_hours, notes,
                                     predicted_level, run_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *"""),
            (officer, hotspot_id, day, flooded, depth, duration_hours, _clean(notes, 1000) or None, predicted, run_id),
        ).fetchone()
    return _jsonable(row)


def feedback_log(limit: int = 50) -> list[dict]:
    with db.connect() as conn:
        found = conn.execute(db.q("SELECT * FROM {feedback} ORDER BY created_at DESC LIMIT %s"), (limit,)).fetchall()
    return [_jsonable(r) for r in found]


# --- Checklist ---------------------------------------------------------------------

def set_check(run_key: str, zone: str, hotspot_id: str, item: str, done: bool, officer: str) -> dict:
    officer = _clean(officer, 80)
    if len(officer) < 2:
        raise OpsError("Enter your name (at least 2 characters).")
    if item not in CHECK_ITEMS:
        raise OpsError("Unknown checklist item.")
    with db.connect() as conn:
        row = conn.execute(db.q(
            """INSERT INTO {checklist} (run_key, zone, hotspot_id, item, done, officer)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON CONFLICT (run_key, zone, hotspot_id, item)
               DO UPDATE SET done = EXCLUDED.done, officer = EXCLUDED.officer, updated_at = now()
               RETURNING *"""),
            (_clean(run_key, 40), _clean(zone, 40), _clean(hotspot_id, 20), item, done, officer),
        ).fetchone()
    return _jsonable(row)


def checklist(run_key: str) -> list[dict]:
    with db.connect() as conn:
        found = conn.execute(db.q("SELECT * FROM {checklist} WHERE run_key = %s"), (run_key,)).fetchall()
    return [_jsonable(r) for r in found]


def reset_exercise() -> None:
    """Clear exercise ticks and overrides, to start a fresh drill."""
    with db.connect() as conn:
        conn.execute(db.q("DELETE FROM {checklist} WHERE run_key = %s"), (EXERCISE_RUN,))
        conn.execute(db.q("UPDATE {overrides} SET revoked_at = now(), revoked_by = 'exercise reset' "
                          "WHERE is_exercise AND revoked_at IS NULL"))
    _forget_active()


def _jsonable(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            out[k] = v.astimezone(IST).isoformat(timespec="seconds")
        elif isinstance(v, date):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# --- Alerts log (milestone 7) --------------------------------------------------------

def log_alerts(officer: str, is_exercise: bool, records: list[dict]) -> None:
    """Store one row per alert per recipient (recipient already masked)."""
    with db.connect() as conn:
        for r in records:
            conn.execute(db.q(
                """INSERT INTO {alerts_log} (officer, hotspot_id, level, is_exercise, channel, recipient, status,
                                             detail, sms_en, sms_hi)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""),
                (officer, r["hotspot_id"], r["level"], is_exercise, r["channel"], r["to"], r["status"],
                 r.get("detail"), r["sms_en"], r["sms_hi"]))


def alert_log(limit: int = 50) -> list[dict]:
    with db.connect() as conn:
        found = conn.execute(db.q("SELECT * FROM {alerts_log} ORDER BY created_at DESC LIMIT %s"), (limit,)).fetchall()
    return [_jsonable(r) for r in found]


# --- Scorecard (milestone 7) -------------------------------------------------------

def scorecard() -> dict:
    """How Agrim's live calls compared with what officers reported afterwards.

    Only real (non-exercise) reports with a recorded forecast count. An alarm
    is Red or Amber. Overrides are judged against reports for the same hotspot
    made while the override applied.
    """
    reports = feedback_log(limit=10000)
    judged = [f for f in reports if f["predicted_level"]]
    alarm = lambda lvl: lvl in ("red", "amber")
    counts = {
        "hits": sum(1 for f in judged if alarm(f["predicted_level"]) and f["flooded"]),
        "misses": sum(1 for f in judged if not alarm(f["predicted_level"]) and f["flooded"]),
        "false_alarms": sum(1 for f in judged if alarm(f["predicted_level"]) and not f["flooded"]),
        "correct_clear": sum(1 for f in judged if not alarm(f["predicted_level"]) and not f["flooded"]),
    }
    floods = counts["hits"] + counts["misses"]
    alarms = counts["hits"] + counts["false_alarms"]

    outcomes = []
    for o in override_log(limit=500):
        if o["is_exercise"]:
            continue
        start, end = o["created_at"][:10], o["valid_until"][:10]
        match = [f for f in reports if f["hotspot_id"] == o["hotspot_id"] and start <= f["event_date"] <= end]
        if not match:
            outcomes.append({**{k: o[k] for k in ("id", "hotspot_id", "officer", "model_level", "new_level", "created_at")},
                             "outcome": None, "officer_right": None, "model_right": None})
            continue
        flooded = any(f["flooded"] for f in match)
        outcomes.append({**{k: o[k] for k in ("id", "hotspot_id", "officer", "model_level", "new_level", "created_at")},
                         "outcome": "flooded" if flooded else "stayed clear",
                         "officer_right": alarm(o["new_level"]) == flooded,
                         "model_right": None if not o["model_level"] else alarm(o["model_level"]) == flooded})
    return {
        "counts": counts,
        "reports_total": len(reports),
        "reports_judged": len(judged),
        "reports_without_forecast": len(reports) - len(judged),
        "flood_catch_rate": round(counts["hits"] / floods, 3) if floods else None,
        "alarm_accuracy": round(counts["hits"] / alarms, 3) if alarms else None,
        "overrides": outcomes,
        "note": "Live operations only; exercise actions are excluded. An alarm means Red or Amber.",
    }
