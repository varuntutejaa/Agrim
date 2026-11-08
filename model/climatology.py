"""Rain climatology per hotspot: what "normal" and "extreme" look like there.

Run from the repo root (after pipeline.fetch_rain_history):
    python -m model.climatology

Why: the forecast models are much smoother than a rain gauge. In 9 monsoons
(2018-2026) the ECMWF series over Gurugram reached IMD's "heavy rain" mark
(64.5 mm/day) on only 2 days, and its wettest hour was ~30 mm. So fixed
gauge thresholds would almost never fire. Instead, each forecast is compared
with the same model's own history at that hotspot: "wetter than 99% of
monsoon hours here". This idea comes from JalNetra's river monitor, which
classified each river point against its own record.

For every hotspot and every monsoon hour, three rolling windows are computed:
  rain_24h    total rain in the 24 h ending at that hour
  peak1h_24h  wettest single hour within those 24 h
  rain_72h    total rain in the 72 h ending at that hour (wet ground)
and their quantiles are written to data/model/rain_climatology.csv.

Model: ECMWF IFS only, the same model family the forecast is scored on.
"""
import glob

import pandas as pd

from pipeline.config import DATA_DIR, RAIN_DIR

CLIMATOLOGY_CSV = DATA_DIR / "model" / "rain_climatology.csv"
MODEL = "ecmwf_ifs"
QUANTILES = [0.5, 0.75, 0.9, 0.95, 0.99, 0.995, 0.999, 1.0]
VARIABLES = ["rain_24h", "peak1h_24h", "rain_72h"]


def rolling_windows(hourly: pd.DataFrame) -> pd.DataFrame:
    """Add the three rolling windows to one hotspot's hourly series (one monsoon at a time)."""
    out = []
    for _, season in hourly.groupby(hourly["time"].dt.year):
        s = season.set_index("time")["precip_mm"].fillna(0)
        out.append(pd.DataFrame({
            "rain_24h": s.rolling(24, min_periods=24).sum(),
            "peak1h_24h": s.rolling(24, min_periods=24).max(),
            "rain_72h": s.rolling(72, min_periods=72).sum(),
        }).dropna())
    return pd.concat(out)


def main():
    files = sorted(glob.glob(str(RAIN_DIR / "history" / "history_*.csv")))
    if not files:
        raise SystemExit("No history found. Run: python -m pipeline.fetch_rain_history")
    df = pd.concat(pd.read_csv(f, parse_dates=["time"]) for f in files)
    df = df[df["model"] == MODEL]
    years = sorted(df["time"].dt.year.unique())

    rows = []
    for point_id, g in df.groupby("point_id"):
        windows = rolling_windows(g.sort_values("time"))
        row = {"id": point_id, "model": MODEL, "years": f"{years[0]}-{years[-1]}", "n_hours": len(windows)}
        for var in VARIABLES:
            for q in QUANTILES:
                row[f"{var}_q{q:g}"] = round(float(windows[var].quantile(q)), 2)
        rows.append(row)

    CLIMATOLOGY_CSV.parent.mkdir(parents=True, exist_ok=True)
    out = pd.DataFrame(rows)
    out.to_csv(CLIMATOLOGY_CSV, index=False)
    print(f"Wrote {CLIMATOLOGY_CSV} ({len(out)} hotspots, monsoons {years[0]}-{years[-1]})")
    print(out[["id", "rain_24h_q0.99", "rain_24h_q0.999", "rain_24h_q1", "peak1h_24h_q0.99", "rain_72h_q0.99"]]
          .describe().loc[["min", "50%", "max"]].round(1))


if __name__ == "__main__":
    main()
