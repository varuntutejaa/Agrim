"""Agrim API (FastAPI).

Run from the repo root:
    uvicorn api.main:app --reload --port 8000
Docs (auto-generated): http://localhost:8000/docs

Milestone 1 endpoints:
  GET /health        is the server up, and how fresh is the forecast
  GET /hotspots      hotspots as GeoJSON (map layer)
  GET /rain/latest   per grid point rain summary from the newest forecast run

Later milestones add /network, /forecast/latest, /forecast/run, /simulate,
/override, /feedback, /orders/{zone}, /scorecard.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import data

app = FastAPI(title="Agrim API", version="0.1.0",
              description="Flood early-warning for Gurugram's waterlogging hotspots.")

# The React app runs on a different origin (Vite dev server / Vercel).
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


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
