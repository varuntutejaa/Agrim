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

Later milestones add /forecast/latest, /forecast/run, /simulate, /override,
/feedback, /orders/{zone}, /scorecard.
"""
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api import data

app = FastAPI(title="Agrim API", version="0.1.0",
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
