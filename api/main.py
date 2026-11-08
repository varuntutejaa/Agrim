"""Agrim API (FastAPI).

Run from the repo root:
    uvicorn api.main:app --reload --port 8000
Docs (auto-generated): http://localhost:8000/docs

Endpoints so far:
  GET /health               is the server up, and how fresh is the forecast
  GET /hotspots             hotspots as GeoJSON (map layer)
  GET /rain/latest          per grid point rain summary from the newest forecast run
  GET /network              drainage graph: hotspot nodes (ranked) + flow-path edges
  GET /network/catchments   upstream catchment polygon per hotspot
  GET /network/streams      DEM-derived flow lines (map context)
  GET /network/drains       OpenStreetMap drains and streams (map context)
  GET /forecast/latest      Red/Amber/Green risk per hotspot, confidence, drivers, action
  POST /forecast/run        re-score now (optionally fetching a fresh forecast)

  POST /simulate            run the rules on chosen rain (storm) or a past day (replay)
  GET  /simulate/events     curated past days for one-tap replay
  GET  /simulate/dates      every monsoon day on record with rain

  MCG operations (milestone 5; stored in Neon Postgres, see api/db.py):
  GET  /orders/{zone}       SMS-style orders per zone from the live forecast ("all" for every zone)
  POST /orders/exercise     the same, for a simulated storm (marked EXERCISE)
  POST /override            officer sets a hotspot's level, with name and reason (logged)
  POST /override/{id}/revoke
  GET  /overrides           override log
  POST /feedback            after an event: flooded yes/no, depth, duration
  GET  /feedback            feedback log
  GET  /checklist           SOP ticks for a run;  POST /checklist to tick/untick
  POST /exercise/reset      clear exercise ticks and overrides

  Model (milestone 6):
  GET  /model/status        Tier B (XGBoost) training status and honest check results

Milestone 7 adds /scorecard.
"""
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api import data, db, ops, scheduler
from pipeline.config import TIMEZONE


@asynccontextmanager
async def lifespan(_app):
    sched = scheduler.start()   # no-op unless SCHEDULER=on
    yield
    if sched:
        sched.shutdown(wait=False)
    db.close()


app = FastAPI(title="Agrim API", version="0.3.0", lifespan=lifespan,
              description="Flood early-warning for Gurugram's waterlogging hotspots.")

# The React app runs on a different origin (Vite dev server / Vercel).
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])
# Map layers are mostly repeated coordinates; gzip cuts them ~5x (matters on phones).
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.get("/health")
def health():
    meta = data.rain_latest_geojson()["meta"]
    return {"ok": True, "forecast_fetched_at": meta and meta["fetched_at"],
            "forecast_age_hours": meta and meta["age_hours"]}


@app.get("/hotspots")
def hotspots():
    return data.hotspots_geojson()


@app.get("/rain/latest")
def rain_latest():
    return data.rain_latest_geojson()


def _network_or_404(name: str):
    data_ = data.network_file(name)
    if data_ is None:
        raise HTTPException(404, "Network not built yet. Run: python -m pipeline.build_network")
    return data_


@app.get("/network")
def network():
    return _network_or_404("network")


@app.get("/network/catchments")
def network_catchments():
    return _network_or_404("catchments")


@app.get("/network/streams")
def network_streams():
    return _network_or_404("streams")


@app.get("/network/drains")
def network_drains():
    return _network_or_404("drains")


# --- Risk forecast ----------------------------------------------------------------

FETCH_COOLDOWN = timedelta(minutes=10)   # don't let anyone hammer the free weather API
_last_fetch: dict = {"at": None}


@app.get("/forecast/latest")
def forecast_latest():
    result = scheduler.latest()
    if result is None:
        # First request on a fresh server: score whatever forecast is on disk.
        result = scheduler.run_now(fetch=not data.FORECAST_CSV.exists(), reason="first request")
    if result is None:
        raise HTTPException(503, "No forecast yet; try again in a minute.")
    return ops.apply_overrides(result, is_exercise=False)


class RunRequest(BaseModel):
    fetch: bool = False   # also download a fresh forecast from Open-Meteo


@app.post("/forecast/run")
def forecast_run(body: RunRequest, x_agrim_token: str | None = Header(default=None)):
    token = os.getenv("RUN_TOKEN", "")
    if token and x_agrim_token != token:
        raise HTTPException(401, "Missing or wrong x-agrim-token header")
    now = datetime.now(ZoneInfo(TIMEZONE))
    if body.fetch:
        if _last_fetch["at"] and now - _last_fetch["at"] < FETCH_COOLDOWN:
            raise HTTPException(429, "A fresh forecast was fetched less than 10 minutes ago.")
        _last_fetch["at"] = now
    result = scheduler.run_now(fetch=body.fetch, reason="manual")
    if result is None:
        raise HTTPException(409, "A forecast run is already in progress.")
    return result["meta"]


# --- Simulator (milestone 4) ---------------------------------------------------------

class SimulateRequest(BaseModel):
    mode: str = Field("storm", pattern="^(storm|replay)$")
    # storm mode
    rain_24h: float = 80
    peak1h: float = 20
    past_72h: float = 20
    centre: list[float] | None = Field(None, min_length=2, max_length=2, description="[lon, lat]; omit for even rain")
    radius_km: float = 6
    # replay mode
    date: str | None = None


@app.post("/simulate")
def simulate(body: SimulateRequest):
    from model import simulate as sim   # imported lazily: loads the replay table
    if body.mode == "replay":
        if not body.date:
            raise HTTPException(422, "date is required for replay")
        try:
            return ops.apply_overrides(sim.run_replay(body.date), is_exercise=True)
        except ValueError as err:
            raise HTTPException(404, str(err))
    centre = tuple(body.centre) if body.centre else None
    return ops.apply_overrides(sim.run_storm(body.rain_24h, body.peak1h, body.past_72h, centre, body.radius_km),
                               is_exercise=True)


@app.get("/simulate/events")
def simulate_events():
    from model import simulate as sim
    return sim.replay_events()


@app.get("/simulate/dates")
def simulate_dates():
    from model import simulate as sim
    return {"dates": sim.replay_dates()}


# --- MCG operations (milestone 5) -------------------------------------------------------

def _desk_guard(x_agrim_desk: str | None):
    """Writes need the database, and the desk code if OPS_TOKEN is set."""
    if not db.configured():
        raise HTTPException(503, "Database not configured: add DATABASE_URL (Neon) to .env.")
    token = os.getenv("OPS_TOKEN", "")
    if token and x_agrim_desk != token:
        raise HTTPException(401, "Desk code missing or wrong.")


def _known_ids() -> set:
    return {f["properties"]["id"] for f in data.hotspots_geojson()["features"]}


def _ops_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except ops.OpsError as err:
        raise HTTPException(422, str(err))


@app.get("/orders/{zone}")
def orders(zone: str, window: str = "next_24h"):
    from model.orders import build_orders
    if window not in ("next_24h", "day_2"):
        raise HTTPException(422, "window must be next_24h or day_2")
    return build_orders(forecast_latest(), zone=zone, window=window, exercise=False)


class ExerciseOrdersRequest(SimulateRequest):
    zone: str = "all"


@app.post("/orders/exercise")
def orders_exercise(body: ExerciseOrdersRequest):
    from model.orders import build_orders
    return build_orders(simulate(body), zone=body.zone, window="next_24h", exercise=True)


class OverrideRequest(BaseModel):
    officer: str
    hotspot_id: str
    new_level: str
    reason: str
    valid_hours: float = 24
    is_exercise: bool = False
    model_level: str | None = None
    run_id: str | None = None


@app.post("/override")
def create_override(body: OverrideRequest, x_agrim_desk: str | None = Header(default=None)):
    _desk_guard(x_agrim_desk)
    return _ops_call(ops.create_override, body.officer, body.hotspot_id, body.new_level, body.reason,
                     body.valid_hours, body.is_exercise, body.model_level, body.run_id, _known_ids())


class RevokeRequest(BaseModel):
    officer: str


@app.post("/override/{override_id}/revoke")
def revoke_override(override_id: int, body: RevokeRequest, x_agrim_desk: str | None = Header(default=None)):
    _desk_guard(x_agrim_desk)
    return _ops_call(ops.revoke_override, override_id, body.officer)


@app.get("/overrides")
def overrides(limit: int = 50):
    if not db.configured():
        return {"available": False, "overrides": []}
    return {"available": True, "overrides": ops.override_log(min(limit, 200))}


class FeedbackRequest(BaseModel):
    officer: str
    hotspot_id: str
    event_date: str
    flooded: bool
    depth: str | None = None
    duration_hours: float | None = None
    notes: str | None = None


@app.post("/feedback")
def create_feedback(body: FeedbackRequest, x_agrim_desk: str | None = Header(default=None)):
    _desk_guard(x_agrim_desk)
    return _ops_call(ops.create_feedback, body.officer, body.hotspot_id, body.event_date, body.flooded,
                     body.depth, body.duration_hours, body.notes, _known_ids())


@app.get("/feedback")
def feedback(limit: int = 50):
    if not db.configured():
        return {"available": False, "feedback": []}
    return {"available": True, "feedback": ops.feedback_log(min(limit, 200))}


class CheckRequest(BaseModel):
    run_key: str
    zone: str
    hotspot_id: str = ""
    item: str
    done: bool
    officer: str


@app.get("/checklist")
def get_checklist(run_key: str):
    if not db.configured():
        return {"available": False, "ticks": []}
    return {"available": True, "ticks": ops.checklist(run_key)}


@app.post("/checklist")
def set_checklist(body: CheckRequest, x_agrim_desk: str | None = Header(default=None)):
    _desk_guard(x_agrim_desk)
    return _ops_call(ops.set_check, body.run_key, body.zone, body.hotspot_id, body.item, body.done, body.officer)


@app.post("/exercise/reset")
def exercise_reset(x_agrim_desk: str | None = Header(default=None)):
    _desk_guard(x_agrim_desk)
    ops.reset_exercise()
    return {"ok": True}


# --- Machine-learning model (milestone 6) -------------------------------------------------

@app.get("/model/status")
def model_status():
    from model import ml
    from model.labels import from_incidents
    st = ml.status()
    # Live label counts, so the app can show progress before the next training run.
    reports = from_incidents()
    st["labels_now"] = {"reports": len(reports), "report_floods": sum(r["flooded"] for r in reports)}
    return st
