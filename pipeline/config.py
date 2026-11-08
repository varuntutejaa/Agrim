"""Shared settings for the pipeline and the API.

Everything that more than one script needs (paths, the study-area box,
the HTTP User-Agent) lives here so it is changed in one place.
"""
from pathlib import Path
import os

from dotenv import load_dotenv

# Repo root = the folder that contains /pipeline, /api, /data ...
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DATA_DIR = ROOT / "data"
CACHE_DIR = DATA_DIR / "cache"            # raw API responses (gitignored)
RAIN_DIR = DATA_DIR / "rain"              # tidy rainfall tables (gitignored)
SYNTHETIC_DIR = DATA_DIR / "synthetic"    # illustrative data ONLY, never mixed with real data

HOTSPOTS_SEED_CSV = DATA_DIR / "hotspots_seed.csv"
HOTSPOTS_CSV = DATA_DIR / "hotspots.csv"
INCIDENTS_CSV = DATA_DIR / "incidents.csv"

# Study area for the Municipal Corporation of Gurugram (MCG) city area.
# (south, west, north, east) in decimal degrees.
# Checked against the geocoded hotspots: geocode_hotspots.py warns if any
# hotspot falls outside or near the edge. Manesar (west of ~76.94) is
# deliberately excluded because it has its own "Sector 5" / "Sector 15".
# Note for milestone 2: the upstream catchment (Aravalli ridge to the south
# and south-east) extends beyond this box, so the DEM will use a larger one.
BBOX = (28.35, 76.95, 28.55, 77.15)

# Rain grid spacing in degrees. 0.02 deg is ~2.2 km north-south and
# ~2.0 km east-west at Gurugram's latitude.
GRID_STEP_DEG = 0.02

TIMEZONE = "Asia/Kolkata"

# Public services ask callers to identify themselves. Generic name by
# default; a team contact can be added in .env (NOMINATIM_CONTACT).
_contact = os.getenv("NOMINATIM_CONTACT", "").strip()
USER_AGENT = "Agrim-flood-prototype/0.1 (SustainX 2026)" + (f" {_contact}" if _contact else "")

# Open-Meteo endpoints (free, no key needed for non-commercial use).
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

# Forecast models to request. Each one is a separate opinion about the
# same rain; the spread between them feeds the confidence step later.
FORECAST_MODELS = ["ecmwf_ifs", "gfs_seamless", "icon_seamless"]

# Historical rainfall. ERA5-Land returns no precipitation for Gurugram on
# Open-Meteo (checked Nov 2026), so we use ECMWF IFS analysis (~9 km, from
# 2017) as the main series and ERA5 (~25 km) as a cross-check.
HISTORY_MODELS = ["ecmwf_ifs", "era5"]


# --- Milestone 2: terrain and drainage network --------------------------------

# Larger box for terrain work. Water reaching the city comes from the
# Aravalli ridge to the south and south-east, and leaves north toward the
# Najafgarh drain, so the DEM must extend well past the city box.
DEM_BBOX = (28.28, 76.85, 28.62, 77.30)   # (south, west, north, east)

# Work in metres: UTM zone 43N covers 72-78 E. 30 m matches the DEM.
UTM_CRS = "EPSG:32643"
DEM_RES_M = 30

DEM_DIR = DATA_DIR / "dem"            # rasters (gitignored, regenerated)
LANDCOVER_DIR = DATA_DIR / "landcover"
OSM_DIR = DATA_DIR / "osm"            # raw OSM downloads (gitignored)
NETWORK_DIR = DATA_DIR / "network"    # small derived files the API serves (committed)

DEM_TIF = DEM_DIR / "dem_utm30.tif"
BUILTUP_TIF = LANDCOVER_DIR / "builtup_frac_utm30.tif"
WATERWAYS_GEOJSON = OSM_DIR / "waterways.geojson"


def in_bbox(lat: float, lon: float, bbox=BBOX) -> bool:
    """True if the point lies inside the study-area box."""
    south, west, north, east = bbox
    return south <= lat <= north and west <= lon <= east
