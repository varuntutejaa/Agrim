"""Fetch historical hourly rainfall (monsoon months) at each hotspot.

Run from the repo root:
    python -m pipeline.fetch_rain_history                    # 2018 to this year, Jun-Sep
    python -m pipeline.fetch_rain_history --years 2025       # one year (quick test)

Writes data/rain/history/history_<year>.csv (one row per hotspot, model, hour).
Years already on disk are skipped, so an interrupted run can simply be restarted.

Why hotspots and not the full grid? Open-Meteo's free tier counts long
date ranges as many calls; 9 monsoons x 121 grid points would exceed the
daily limit. The models are ~9-25 km anyway, so the 20-odd hotspots cover
every distinct model cell over the city.

Models (see config.HISTORY_MODELS): ECMWF IFS analysis (~9 km, from 2017)
is the main series; ERA5 (~25 km) is a cross-check. ERA5-Land has no
precipitation for Gurugram on Open-Meteo.
"""
import argparse
import csv
from datetime import date

from pipeline.config import HISTORY_MODELS, HOTSPOTS_CSV, OPEN_METEO_ARCHIVE_URL, RAIN_DIR
from pipeline.open_meteo import fetch_hourly_precip

HISTORY_DIR = RAIN_DIR / "history"
MONSOON = ("06-01", "09-30")  # IMD south-west monsoon season


def located_hotspots() -> list:
    """Hotspots that have coordinates (unlocated ones are skipped, with a message)."""
    with HOTSPOTS_CSV.open(newline="") as f:
        rows = list(csv.DictReader(f))
    points = [{"point_id": r["id"], "lat": float(r["lat"]), "lon": float(r["lon"])} for r in rows if r["lat"]]
    skipped = [r["id"] for r in rows if not r["lat"]]
    if skipped:
        print(f"Skipping hotspots without coordinates: {skipped}")
    return points


def main():
    this_year = date.today().year
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--years", type=int, nargs="+", default=list(range(2018, this_year + 1)))
    parser.add_argument("--force", action="store_true", help="re-download years already on disk")
    args = parser.parse_args()

    points = located_hotspots()
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

    for year in args.years:
        out = HISTORY_DIR / f"history_{year}.csv"
        if out.exists() and not args.force:
            print(f"{year}: already on disk, skipping")
            continue
        start, end = f"{year}-{MONSOON[0]}", f"{year}-{MONSOON[1]}"
        # The archive lags real time by a few days; don't ask for the future.
        end = min(end, date.today().isoformat())
        if start > end:
            continue
        print(f"{year}: fetching {start} to {end} for {len(points)} hotspots ...")
        df = fetch_hourly_precip(OPEN_METEO_ARCHIVE_URL, points, HISTORY_MODELS,
                                 {"start_date": start, "end_date": end})
        df.to_csv(out, index=False)
        season = df.groupby(["model", "point_id"])["precip_mm"].sum().groupby("model").mean()
        print("   mean season total per hotspot (mm): " +
              ", ".join(f"{m} {v:.0f}" for m, v in season.items()))


if __name__ == "__main__":
    main()
