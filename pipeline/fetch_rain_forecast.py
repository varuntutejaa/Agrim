"""Fetch the hourly rainfall forecast on a ~2 km grid over Gurugram.

Run from the repo root:
    python -m pipeline.fetch_rain_forecast

Writes
  data/rain/forecast/forecast_<run_id>.csv   one file per run (kept for replay/evaluation)
  data/rain/forecast/latest.csv              copy of the newest run (what the API serves)
  data/rain/forecast/latest_meta.json        when it was fetched, which models, grid info

Each file covers the last 3 days (for "antecedent rain") plus the next 3 days.

Honest note on resolution: the global models behind Open-Meteo have grid
cells of roughly 9-25 km, so neighbouring 2 km points often get identical
numbers. The script prints how many *distinct* rain series each model gave,
so we never overstate how local the forecast really is.
"""
import json
import shutil
from datetime import datetime
from zoneinfo import ZoneInfo

import numpy as np

from pipeline.config import (
    BBOX, FORECAST_MODELS, GRID_STEP_DEG, OPEN_METEO_FORECAST_URL, RAIN_DIR, TIMEZONE,
)
from pipeline.open_meteo import fetch_hourly_precip

FORECAST_DIR = RAIN_DIR / "forecast"


def build_grid(bbox=BBOX, step=GRID_STEP_DEG) -> list:
    """Regular lat/lon grid covering the study box. Point ids look like G0305 (row 3, col 5)."""
    south, west, north, east = bbox
    lats = np.arange(south, north + 1e-9, step)
    lons = np.arange(west, east + 1e-9, step)
    return [
        {"point_id": f"G{i:02d}{j:02d}", "lat": round(float(lat), 4), "lon": round(float(lon), 4)}
        for i, lat in enumerate(lats)
        for j, lon in enumerate(lons)
    ]


def main():
    now = datetime.now(ZoneInfo(TIMEZONE))
    run_id = now.strftime("%Y%m%dT%H%M")
    grid = build_grid()
    print(f"Fetching {len(FORECAST_MODELS)} models x {len(grid)} grid points from Open-Meteo ...")

    df = fetch_hourly_precip(
        OPEN_METEO_FORECAST_URL, grid, FORECAST_MODELS,
        {"forecast_days": 3, "past_days": 3},
    )

    FORECAST_DIR.mkdir(parents=True, exist_ok=True)
    run_csv = FORECAST_DIR / f"forecast_{run_id}.csv"
    df.to_csv(run_csv, index=False)
    shutil.copyfile(run_csv, FORECAST_DIR / "latest.csv")

    meta = {
        "run_id": run_id,
        "fetched_at": now.isoformat(timespec="seconds"),
        "source": "Open-Meteo Forecast API (https://open-meteo.com/en/docs)",
        "models": FORECAST_MODELS,
        "bbox_south_west_north_east": BBOX,
        "grid_step_deg": GRID_STEP_DEG,
        "n_points": len(grid),
        "hours": "past 3 days + next 3 days, hourly, Asia/Kolkata",
        "is_synthetic": False,
    }
    (FORECAST_DIR / "latest_meta.json").write_text(json.dumps(meta, indent=2))

    # Summary: next-24 h total per model, and how many distinct series each model gave.
    now_naive = now.replace(tzinfo=None, minute=0, second=0, microsecond=0)
    times = df["time"].astype("datetime64[ns]")
    next24 = df[(times >= now_naive) & (times < now_naive + np.timedelta64(24, "h"))]
    print(f"\nSaved {len(df):,} rows to {run_csv}")
    for model, g in df.groupby("model"):
        missing = g["precip_mm"].isna().mean()
        distinct = g.groupby("point_id")["precip_mm"].apply(lambda s: tuple(s.fillna(-1))).nunique()
        totals = next24[next24["model"] == model].groupby("point_id")["precip_mm"].sum()
        print(f"  {model:<14} next-24h max {totals.max():6.1f} mm | "
              f"{distinct:3d} distinct series over {len(grid)} points | {missing:.0%} missing")


if __name__ == "__main__":
    main()
