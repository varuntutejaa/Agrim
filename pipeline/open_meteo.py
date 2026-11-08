"""Small helper for Open-Meteo's forecast and historical (archive) APIs.

Open-Meteo accepts many points in one request (comma-separated lat/lon)
and returns one block per point. We split points into chunks to keep URLs
short, retry on temporary errors, and flatten everything into one tidy
table with one row per (point, model, hour):

    point_id, lat, lon, time, model, precip_mm
"""
import time

import pandas as pd
import requests

from pipeline.config import TIMEZONE, USER_AGENT

CHUNK_SIZE = 50  # points per request


def _get_with_retry(url: str, params: dict, tries: int = 4) -> list:
    """GET with simple backoff for rate limits / server hiccups. Always returns a list of blocks."""
    for attempt in range(tries):
        r = requests.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=120)
        if r.status_code in (429, 500, 502, 503, 504) and attempt < tries - 1:
            wait = 5 * (attempt + 1)
            print(f"   Open-Meteo returned {r.status_code}; retrying in {wait}s")
            time.sleep(wait)
            continue
        if r.status_code >= 400:
            # Open-Meteo explains bad requests in {"reason": ...}
            raise RuntimeError(f"Open-Meteo error {r.status_code}: {r.text[:300]}")
        data = r.json()
        return data if isinstance(data, list) else [data]  # single point -> dict
    raise RuntimeError("Open-Meteo: out of retries")


def fetch_hourly_precip(url: str, points: list, models: list, extra_params: dict) -> pd.DataFrame:
    """Fetch hourly precipitation (mm) for `points` from every model in `models`.

    points: list of dicts with keys point_id, lat, lon
    extra_params: e.g. {"forecast_days": 3} or {"start_date": ..., "end_date": ...}
    """
    frames = []
    for start in range(0, len(points), CHUNK_SIZE):
        chunk = points[start:start + CHUNK_SIZE]
        params = {
            "latitude": ",".join(f"{p['lat']:.4f}" for p in chunk),
            "longitude": ",".join(f"{p['lon']:.4f}" for p in chunk),
            "hourly": "precipitation",
            "models": ",".join(models),
            "timezone": TIMEZONE,
            **extra_params,
        }
        blocks = _get_with_retry(url, params)
        for point, block in zip(chunk, blocks):
            hourly = block["hourly"]
            for model in models:
                # With several models the column is "precipitation_<model>";
                # with exactly one it is plain "precipitation".
                key = f"precipitation_{model}" if len(models) > 1 else "precipitation"
                frames.append(pd.DataFrame({
                    "point_id": point["point_id"],
                    "lat": point["lat"],
                    "lon": point["lon"],
                    "time": hourly["time"],
                    "model": model,
                    "precip_mm": hourly.get(key),
                }))
        time.sleep(0.5)  # be gentle with the free API
    return pd.concat(frames, ignore_index=True)
