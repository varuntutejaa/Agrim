# Reference code from JalNetra (our earlier project)

JalNetra was a river/glacier flood warning system for the Gandak basin
(Nepal → Bihar). Most of it doesn't apply to urban waterlogging in
Gurugram, so only these files were kept. They are **reference only**:
nothing here is imported or run by Agrim. Each one gets rewritten into
Agrim's own code (Python pipeline / FastAPI / React) in the milestone noted.

**Status:** `dem.py`, `grid.py`, `corridor.py` (HAND) and `lc.py` are now
wired in as `pipeline/fetch_dem.py`, `pipeline/raster_grid.py`,
`pipeline/build_network.py` and `pipeline/fetch_landcover.py`. `monitor.ts`
is wired in as `model/climatology.py` + `model/rules.py` (judge each spot
against its own record) and `model/run_forecast.py` + `api/scheduler.py`
(precomputed results, scheduled runs). `demoScenarios.ts` is wired in as
`model/replay.py` + `model/simulate.py` (fixed, versioned replay list, and the
EXERCISE / अभ्यास label on every simulated result). The rest are waiting
for their milestones.

**No JalNetra data is reused.** Its rivers, villages, GloFAS series and
model weights are for a different region, and copying them would break the
no-fabricated-data rule.

| File | What it shows | Use in Agrim | Milestone |
|------|---------------|--------------|-----------|
| ✅ `dem.py`, `grid.py` | Reads **Copernicus DEM GLO-30** straight from the public AWS bucket (`copernicus-dem-30m`) with rasterio, no account or API key, onto a fixed lat/lon grid | Elevation for flow direction/accumulation. Gurugram needs tiles `N28_00_E076` and `N28_00_E077`. Replaces SRTM via OpenTopography, so no key is needed | 2 |
| ✅ `corridor.py` | **HAND** (height above nearest drainage): elevation minus the elevation of the nearest channel cell, plus distance to channel | Feature "elevation relative to surroundings" for each hotspot, using OSM drains + DEM flow lines as the channels | 2–3 |
| ✅ `lc.py` | **ESA WorldCover** (and JRC surface-water occurrence) via Microsoft Planetary Computer STAC, anonymous access | Built-up share around each hotspot. Reads ESA's own AWS bucket instead of Planetary Computer (one less dependency) | 2–3 |
| ✅ `monitor.ts` | Classifies each point against **its own history** (p50 / p90 / max → Normal / Rising / Warning / Danger). Writes a **snapshot file** the website reads, so visitors never wait on or rate-limit the weather API | Rule-based thresholds per hotspot from its own rainfall history; serve precomputed `/forecast/latest` so the public map loads in under 5 s | 3 |
| ✅ `demoScenarios.ts` | Fixed, versioned replay scenarios with a simulated clock, and an "EXERCISE / अभ्यास" banner in Hindi and English | Past-event replay in the simulator (31 Jul 2025, 1 Sep 2025), clearly marked as replay | 4 |
| `escalation.mjs`, `ESCALATION.md` | Human-approved, two-stage alerting. Safety rules: phone numbers only from server env (never from a request), masked in logs, single-use decisions that expire, nothing sent without approval. Also Hindi + English message templates | MCG officer approval/override before alerts; Hindi alert text; notifier safety rules | 5, 7 |
| `telephony.ts` | Pluggable SMS/voice dispatch: Twilio SMS, Twilio voice with Hindi TwiML (`Polly.Aditi`), status `sent / failed / not_configured / unknown` (never retry an "unknown") | The pluggable notifier (console by default, Twilio sandbox optional) | 7 |
| `ndrfReport.ts` | One-click PDF advisory (jsPDF). Every number is passed in, missing values show as n/a, and planning assumptions are listed and labelled in the document | Optional printable "zone orders" PDF for MCG (pumps and crews per zone), with assumptions stated | 5 (optional) |

## What was dropped, and why

- **Sentinel-1/2 scripts** (`s1.py`, `s2b.py`, `s2c.py`, `event.py`): radar flood maps don't work well in dense urban areas, and a 12-day revisit misses waterlogging that clears within hours.
- **Raster flood spread, routing, AR, population/phones** (`src/floodSpread`, `src/engine`, `src/live`): built for river inundation over open terrain. Agrim models a hotspot drainage graph instead.
- **AWS backend, CDK infra, Supabase incident API, local Node backend**: Agrim's stack is FastAPI + Render/Railway + Vercel.
- **Gandak/India data, presentation videos, voiceovers, brand images, UI effect components**: specific to JalNetra. Heavy animation also works against the under-5-second phone load target.
