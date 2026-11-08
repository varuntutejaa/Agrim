"""Read the pipeline's output files and shape them for the API.

Files are re-read only when they change on disk (checked by modification
time), so a fresh forecast run shows up without restarting the server.
"""
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd

from pipeline.config import HOTSPOTS_CSV, NETWORK_DIR, RAIN_DIR, TIMEZONE

FORECAST_CSV = RAIN_DIR / "forecast" / "latest.csv"
FORECAST_META = RAIN_DIR / "forecast" / "latest_meta.json"

_cache: dict = {}


def _read_csv_cached(path, **kwargs) -> pd.DataFrame:
    mtime = path.stat().st_mtime
    hit = _cache.get(path)
    if hit and hit[0] == mtime:
        return hit[1]
    df = pd.read_csv(path, **kwargs)
    _cache[path] = (mtime, df)
    return df


def _read_json_cached(path):
    mtime = path.stat().st_mtime
    hit = _cache.get(path)
    if hit and hit[0] == mtime:
        return hit[1]
    data = json.loads(path.read_text())
    _cache[path] = (mtime, data)
    return data


# Files written by pipeline/build_network.py (small, committed to the repo).
NETWORK_FILES = {
    "network": NETWORK_DIR / "network.json",          # {meta, nodes, edges}
    "catchments": NETWORK_DIR / "catchments.geojson",
    "streams": NETWORK_DIR / "streams.geojson",
    "drains": NETWORK_DIR / "drains.geojson",
}


def network_file(name: str):
    """Contents of one network file, or None if the network hasn't been built yet."""
    path = NETWORK_FILES[name]
    return _read_json_cached(path) if path.exists() else None


def hotspots_geojson() -> dict:
    """Hotspots as GeoJSON points. Hotspots without coordinates are listed separately."""
    df = _read_csv_cached(HOTSPOTS_CSV, dtype=str, keep_default_na=False)
    features, unlocated = [], []
    for row in df.to_dict("records"):
        if not row["lat"]:
            unlocated.append({"id": row["id"], "name": row["name"]})
            continue
        props = {k: v for k, v in row.items() if k not in ("lat", "lon")}
        props["verified"] = row["verified"].lower() == "yes"
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(row["lon"]), float(row["lat"])]},
            "properties": props,
        })
    return {"type": "FeatureCollection", "features": features, "unlocated": unlocated}


def rain_latest_geojson() -> dict:
    """Per grid point rain summary from the newest forecast run.

    For each model and for the mean of all models:
      past_24h, past_72h      rain already fallen (antecedent rain), mm
      next_24h, next_48h      forecast totals, mm
      peak_1h_next_24h        heaviest single hour in the next 24 h, mm/h
    """
    if not FORECAST_CSV.exists():
        return {"type": "FeatureCollection", "features": [], "meta": None}

    df = _read_csv_cached(FORECAST_CSV, parse_dates=["time"])
    meta = json.loads(FORECAST_META.read_text())

    now = datetime.now(ZoneInfo(TIMEZONE)).replace(tzinfo=None, minute=0, second=0, microsecond=0)
    windows = {
        "past_72h": (now - timedelta(hours=72), now),
        "past_24h": (now - timedelta(hours=24), now),
        "next_24h": (now, now + timedelta(hours=24)),
        "next_48h": (now, now + timedelta(hours=48)),
    }

    # Add a "mean" model: average of all models at each point and hour.
    mean = df.groupby(["point_id", "lat", "lon", "time"], as_index=False)["precip_mm"].mean()
    mean["model"] = "mean"
    df = pd.concat([df, mean], ignore_index=True)

    summaries = {}
    for name, (start, end) in windows.items():
        part = df[(df["time"] >= start) & (df["time"] < end)]
        summaries[name] = part.groupby(["point_id", "model"])["precip_mm"].sum()
    nxt = df[(df["time"] >= now) & (df["time"] < now + timedelta(hours=24))]
    summaries["peak_1h_next_24h"] = nxt.groupby(["point_id", "model"])["precip_mm"].max()
    table = pd.DataFrame(summaries).round(1).reset_index()

    points = df[["point_id", "lat", "lon"]].drop_duplicates("point_id").set_index("point_id")
    features = []
    for point_id, g in table.groupby("point_id"):
        by_model = {r["model"]: {k: r[k] for k in summaries} for r in g.to_dict("records")}
        p = points.loc[point_id]
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(p["lon"]), float(p["lat"])]},
            "properties": {"point_id": point_id, **by_model["mean"], "by_model": by_model},
        })

    age = datetime.now(ZoneInfo(TIMEZONE)) - datetime.fromisoformat(meta["fetched_at"])
    meta = {**meta, "now": now.isoformat(), "age_hours": round(age.total_seconds() / 3600, 1)}
    return {"type": "FeatureCollection", "features": features, "meta": meta}
