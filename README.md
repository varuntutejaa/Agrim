# Agrim: flood early warning for Gurugram

IMD already forecasts rain. Agrim forecasts **which of Gurugram's
waterlogging hotspots will flood in the next 24–48 hours**, how sure it is,
and where Municipal Corporation of Gurugram (MCG) crews should put pumps
before the rain arrives.

SustainX 2026, Round 2 prototype.

> **Data rule:** nothing shown as real is made up. Illustrative data lives
> only in `data/synthetic/`, carries `is_synthetic = true`, and is labelled
> "Illustrative data" in the UI. Every source is listed in
> [docs/SOURCES.md](docs/SOURCES.md).

## Repo layout

```
pipeline/   data fetching, (M2) drainage network, features
model/      rule-based score + rain climatology, (M6) XGBoost + SHAP
tests/      checks for the scoring rules (python -m pytest -q)
api/        FastAPI backend
web/        React + Vite + TypeScript + MapLibre + Tailwind
data/       hotspots_seed.csv, hotspots.csv, incidents.csv (committed)
            network/ (drainage network outputs the API serves, committed)
            model/rain_climatology.csv (each hotspot's rain record, committed)
            model/replay_days.csv, replay_events.json (simulator replays, committed)
            cache/, rain/, dem/, landcover/, osm/, forecast/ (regenerated, gitignored)
            synthetic/ (illustrative data only)
docs/       SOURCES.md, NETWORK.md, MODEL.md, DESIGN.md, SOP.md, DEMO_SCRIPT.md
reference/  code kept from our earlier JalNetra project, for later milestones
            (not run by Agrim; see reference/jalnetra/README.md)
```

## Setup

Needs Python 3.11 and Node 20+.

```bash
# Python
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-pipeline.txt   # pipeline + API (the API alone needs only requirements.txt)
cp .env.example .env            # then paste your Neon DATABASE_URL into it; never commit .env

# Web
cd web && npm install && cp .env.example .env.local && cd ..
```

## Run

Run all commands from the repo root with the venv active.

```bash
# 1. Geocode the hotspots -> data/hotspots.csv (safe to re-run)
python -m pipeline.geocode_hotspots

# 2. Rainfall forecast on a ~2 km grid -> data/rain/forecast/latest.csv
python -m pipeline.fetch_rain_forecast

# 3. Historical monsoon rainfall at each hotspot (one year to test, or all years)
python -m pipeline.fetch_rain_history --years 2025
python -m pipeline.fetch_rain_history

# 4. Terrain + drainage network -> data/network/ (see docs/NETWORK.md)
python -m pipeline.fetch_dem
python -m pipeline.fetch_landcover
python -m pipeline.fetch_osm
python -m pipeline.build_network       # re-run whenever hotspots.csv changes

# 5. Risk model: each hotspot's rain record, then score the forecast (docs/MODEL.md)
python -m model.climatology            # after step 3; re-run once a year
python -m model.replay                 # past days for the simulator (data/model/replay_*.{csv,json})
python -m model.run_forecast --fetch   # fresh forecast -> data/forecast/latest_risk.json

# 6. API on http://localhost:8000 (docs at /docs)
#    SCHEDULER=on in .env re-runs the forecast twice a day (hourly in storm mode)
uvicorn api.main:app --reload --port 8000

# 7. Web app on http://localhost:5173 (Forecast / Simulator / Drainage / MCG desk)
cd web && npm run dev
```

## Team tasks that need a human

**Check hotspot pins.** Open `http://localhost:5173/?pin=1`. Click a hotspot
to see what the geocoder matched. If the pin is right, set `verified` to
`yes` in `data/hotspots.csv`. If it's wrong, or the hotspot has no pin, click
the right spot on the map. Copy the lat/lon into the CSV and set
`geocode_source` to `manual` and `geocode_status` to `manual`. Re-running the
geocoder never overwrites rows marked `verified = yes` or `manual`.

For roads and large areas (`location_kind` = road / area), pin the exact
stretch that floods, not the road's centre.

**Collect flood incidents.** These labels train the model in milestone 6,
and collecting them is the slowest part, so start now. Only use rows backed
by a real link:

```bash
python -m pipeline.add_incident                 # asks question by question
python -m pipeline.add_incident --list          # see what's there
```

Reports that a hotspot stayed dry during heavy rain (`flooded = no`) are just
as useful as flood reports.

**Adding MCG's full list (159 hotspots):** add rows to `data/hotspots.csv`
(or the seed file) with ids that don't clash, e.g. `MCG-001`. Fill `zone` and
`mcg_severity_grade` from the MCG document, and cite it in SOURCES.md.

## MCG desk and the database

The **MCG desk** tab is for officers: orders per zone (order sheet + crew SMS),
the SOP checklist (T-24 / T-12 / T-3 / T+24), overrides with name and reason,
and the post-rain report form. Switch it to **Exercise** to drill on the
simulator's storm; exercise actions are logged separately. Details: docs/SOP.md.

Officer actions are stored in **Neon Postgres**: set `DATABASE_URL` in `.env`.
Tables are created automatically. Without it, the desk still shows orders
but actions are switched off.

## Milestones

1. ✅ Hotspots geocoded, rainfall fetch, map showing hotspots
2. ✅ DEM drainage network graph + critical nodes view
3. ✅ Rule-based risk score, `/forecast/latest`, Red/Amber/Green map
4. ✅ Simulator and past-event replay
5. ✅ MCG dashboard: ranked list, orders, override log, feedback
6. XGBoost + SHAP once `incidents.csv` has data; honest evaluation
7. Alerts, scorecard, Hindi toggle, deploy, 3-minute demo script

## Deploy

Done in milestone 7: backend on Render or Railway, frontend on Vercel, one
public URL.
