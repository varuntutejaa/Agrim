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

Later milestones add /override, /feedback, /orders/{zone}, /scorecard.
"""
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api import data, scheduler
from pipeline.config import TIMEZONE


@asynccontextmanager
async def lifespan(_app):
    sched = scheduler.start()   # no-op unless SCHEDULER=on
    yield
    if sched:
        sched.shutdown(wait=False)


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
    return result


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
            return sim.run_replay(body.date)
        except ValueError as err:
            raise HTTPException(404, str(err))
    centre = tuple(body.centre) if body.centre else None
    return sim.run_storm(body.rain_24h, body.peak1h, body.past_72h, centre, body.radius_km)


@app.get("/simulate/events")
def simulate_events():
    from model import simulate as sim
    return sim.replay_events()


@app.get("/simulate/dates")
def simulate_dates():
    from model import simulate as sim
    return {"dates": sim.replay_dates()}
