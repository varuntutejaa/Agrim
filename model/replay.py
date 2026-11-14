"""Build the tables the simulator uses to replay past days.

Run from the repo root (after pipeline.fetch_rain_history):
    python -m model.replay

Writes (both small and committed, so replay works on the hosted server
without the raw history files):
  data/model/replay_days.csv     per hotspot and monsoon day with rain:
                                 rain_24h, peak1h, past_72h (ECMWF, IST calendar day)
  data/model/replay_events.json  the curated list of days shown as one-tap
                                 replays in the simulator

Events come from two places, and each says which:
  - "model record": the wettest days in the ECMWF record (derived, factual)
  - "team": dates the team picked; add a sourced flood report to
    data/incidents.csv before presenting one as a confirmed flood.
The list is fixed and versioned so the jury demo is repeatable.
"""
import glob
import json

import pandas as pd

from model.climatology import MODEL
from pipeline.config import DATA_DIR, RAIN_DIR

REPLAY_DAYS_CSV = DATA_DIR / "model" / "replay_days.csv"
REPLAY_EVENTS_JSON = DATA_DIR / "model" / "replay_events.json"
EVENTS_VERSION = "replay-v1"
N_RECORD_DAYS = 3
MIN_RAIN_MM = 1.0   # keep a day if any hotspot got at least this much

# Dates the team chose for the demo. Edit here, then re-run this script.
TEAM_EVENTS = [
    {"date": "2025-07-31", "note": "Date named by the team as a waterlogging day. "
                                   "Flood reports still to be added to incidents.csv."},
    {"date": "2025-09-01", "note": "Date named by the team as a waterlogging day. "
                                   "Flood reports still to be added to incidents.csv."},
]


def build_days() -> pd.DataFrame:
    files = sorted(glob.glob(str(RAIN_DIR / "history" / "history_*.csv")))
    if not files:
        raise SystemExit("No history found. Run: python -m pipeline.fetch_rain_history")
    h = pd.concat(pd.read_csv(f, parse_dates=["time"]) for f in files)
    h = h[h["model"] == MODEL].sort_values("time")

    rows = []
    for hid, g in h.groupby("point_id"):
        s = g.set_index("time")["precip_mm"].fillna(0)
        daily = s.resample("D").agg(["sum", "max"])
        past = s.rolling(72, min_periods=1).sum()      # 72 h ending at each hour
        for day, (total, peak) in daily.iterrows():
            before = day - pd.Timedelta(hours=1)
            rows.append({"date": day.date().isoformat(), "id": hid, "rain_24h": round(total, 1),
                         "peak1h": round(peak, 1),
                         "past_72h": round(float(past.get(before, 0.0)), 1)})
    days = pd.DataFrame(rows)
    wet = days.groupby("date")["rain_24h"].transform("max") >= MIN_RAIN_MM
    return days[wet].reset_index(drop=True)


def describe(days: pd.DataFrame, date: str) -> dict:
    d = days[days["date"] == date]
    if d.empty:
        return {"city_mean_mm": 0.0, "max_mm": 0.0, "peak1h_mm": 0.0}
    return {"city_mean_mm": round(float(d["rain_24h"].mean()), 1),
            "max_mm": round(float(d["rain_24h"].max()), 1),
            "peak1h_mm": round(float(d["peak1h"].max()), 1)}


def label(date: str) -> str:
    return pd.Timestamp(date).strftime("%-d %b %Y")


def main():
    days = build_days()
    REPLAY_DAYS_CSV.parent.mkdir(parents=True, exist_ok=True)
    days.to_csv(REPLAY_DAYS_CSV, index=False)

    city = days.groupby("date")["rain_24h"].mean().sort_values(ascending=False)
    events = []
    for rank, date in enumerate(city.index[:N_RECORD_DAYS], 1):
        events.append({"id": f"record-{rank}", "date": date, "title": label(date), "source": "model record",
                       "note": f"#{rank} wettest day in the ECMWF record, 2018–2026 monsoons.",
                       **describe(days, date)})
    for ev in TEAM_EVENTS:
        events.append({"id": f"team-{ev['date']}", "date": ev["date"], "title": label(ev["date"]),
                       "source": "team", "note": ev["note"], **describe(days, ev["date"])})
    events.sort(key=lambda e: e["date"])

    REPLAY_EVENTS_JSON.write_text(json.dumps({"version": EVENTS_VERSION, "model": MODEL, "events": events}, indent=2))
    print(f"Wrote {REPLAY_DAYS_CSV} ({days['date'].nunique()} days) and {REPLAY_EVENTS_JSON}:")
    for e in events:
        print(f"  {e['title']:<12} city mean {e['city_mean_mm']:5.1f} mm, peak hour {e['peak1h_mm']:4.1f} mm  ({e['source']})")


if __name__ == "__main__":
    main()
