"""Turn the newest rain forecast into Red/Amber/Green risk per hotspot.

Run from the repo root:
    python -m model.run_forecast              # score the forecast already on disk
    python -m model.run_forecast --fetch      # fetch a fresh forecast first

Writes data/forecast/latest_risk.json (what GET /forecast/latest serves) and
an archived copy data/forecast/risk_<run_id>.json for the scorecard later.
Precomputing like this (an idea from JalNetra's river monitor) means a
visitor's page never waits on, or rate-limits, the weather service.

Two windows are scored: the next 24 h and the 24 h after that ("day 2").
"""
import argparse
import csv
import json
import shutil
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd

from model import rules
from model.climatology import CLIMATOLOGY_CSV, MODEL
from pipeline.config import DATA_DIR, HOTSPOTS_CSV, INCIDENTS_CSV, NETWORK_DIR, RAIN_DIR, TIMEZONE

FORECAST_DIR = DATA_DIR / "forecast"
LATEST_RISK = FORECAST_DIR / "latest_risk.json"
TERRAIN_CSV = NETWORK_DIR / "hotspot_terrain.csv"
WINDOWS = {"next_24h": (0, 24), "day_2": (24, 48)}
MIN_REPORTS_FOR_RATE = 3


def _csv_rows(path, key="id") -> dict:
    with open(path, newline="") as f:
        return {r[key]: r for r in csv.DictReader(f)}


def load_static() -> tuple[dict, dict, dict]:
    """(terrain, climatology, hotspots) keyed by hotspot id, numbers parsed."""
    terrain = _csv_rows(TERRAIN_CSV)
    for t in terrain.values():
        for k in ("relief_1km_m", "hand_m", "builtup_share_500m", "max_drained_km2_150m", "catchment_km2"):
            t[k] = float(t[k])
        t["n_downstream"] = int(t["n_downstream"])
        t["upstream_grid_points"] = t["upstream_grid_points"].split()
        t["upstream_ids"] = t["upstream_ids"].split()
        t["downstream_ids"] = t["downstream_ids"].split()
    clim = {k: {c: (float(v) if c.startswith(("rain", "peak")) else v) for c, v in row.items()}
            for k, row in _csv_rows(CLIMATOLOGY_CSV).items()}
    return terrain, clim, _csv_rows(HOTSPOTS_CSV)


def flood_history() -> dict:
    """Per hotspot: past reports from incidents.csv (team-compiled, sourced)."""
    out = {}
    with open(INCIDENTS_CSV, newline="") as f:
        for r in csv.DictReader(f):
            h = out.setdefault(r["hotspot_id"], {"reports": 0, "flooded": 0})
            h["reports"] += 1
            h["flooded"] += r["flooded"] == "yes"
    for h in out.values():
        h["flood_rate"] = round(h["flooded"] / h["reports"], 2) if h["reports"] >= MIN_REPORTS_FOR_RATE else None
    return out


def window_rain(series: pd.Series, start, end) -> pd.Series:
    return series[(series.index >= start) & (series.index < end)]


def rain_inputs(fc: pd.DataFrame, t: dict, start, end) -> dict:
    """Rain numbers for one hotspot and window, from the forecast table.

    The score uses ECMWF (same model as the climatology). The other models
    are reported alongside as a check on how much forecasts disagree.
    """
    ecmwf = fc[fc["model"] == MODEL]
    spot = ecmwf[ecmwf["point_id"] == t["spot_grid_point"]].set_index("time")["precip_mm"].fillna(0)
    upstream = (ecmwf[ecmwf["point_id"].isin(t["upstream_grid_points"])]
                .groupby("time")["precip_mm"].mean().fillna(0))
    win = window_rain(spot, start, end)
    past = window_rain(spot, start - timedelta(hours=72), start)

    # Wet window: hours with at least half the peak (and >= 1 mm), for alert wording.
    wet = win[(win >= max(1.0, 0.5 * win.max()))] if len(win) else win
    by_model = {}
    for model, g in fc[fc["point_id"] == t["spot_grid_point"]].groupby("model"):
        by_model[model] = round(float(window_rain(g.set_index("time")["precip_mm"].fillna(0), start, end).sum()), 1)

    return {
        "rain_24h": round(float(win.sum()), 1),
        "peak1h": round(float(win.max()) if len(win) else 0.0, 1),
        "upstream_rain_24h": round(float(window_rain(upstream, start, end).sum()), 1),
        "rain_past_72h": round(float(past.sum()), 1),
        "rain_24h_by_model": by_model,
        "wet_window": ({"start": wet.index.min().isoformat(), "end": (wet.index.max() + timedelta(hours=1)).isoformat()}
                       if len(wet) else None),
    }


LEVEL_ORDER = {"red": 0, "amber": 1, "green": 2}


def score_all(rain_for, window_names, terrain, clim, hotspots, history):
    """Score every hotspot for each window. Shared by the live forecast and the simulator.

    rain_for(hotspot_id, terrain_row, window_name) -> rain dict for rules.assess.
    Returns (hotspot entries sorted by risk, counts per window and level).
    """
    results = []
    for hid, h in hotspots.items():
        base = {"id": hid, "name": h["name"], "zone": h["zone"], "verified": h["verified"].lower() == "yes"}
        if hid not in terrain or hid not in clim:
            results.append({**base, "scored": False, "reason": "No location yet, so no terrain or rain data"})
            continue
        t = terrain[hid]
        windows = {}
        for wname in window_names:
            rain = rain_for(hid, t, wname)
            windows[wname] = {**rules.assess(rain, t, clim[hid], h), "rain": rain}
        results.append({
            **base, "scored": True,
            "critical_rank": int(t["critical_rank"]),
            "downstream": t["downstream_ids"],
            "windows": windows,
            "history": history.get(hid, {"reports": 0, "flooded": 0, "flood_rate": None}),
            # Placeholders until MCG / sensor data exists.
            "drain_silt_status": None,
            "drain_level_m": None,
        })

    first = window_names[0]
    results.sort(key=lambda r: (not r["scored"],
                                LEVEL_ORDER[r["windows"][first]["level"]] if r["scored"] else 3,
                                -r["windows"][first]["score"] if r["scored"] else 0))
    counts = {w: {lvl: sum(1 for r in results if r["scored"] and r["windows"][w]["level"] == lvl)
                  for lvl in LEVEL_ORDER} for w in window_names}
    return results, counts


def run(fetch: bool = False) -> dict:
    """Score every hotspot for both windows and write latest_risk.json."""
    if fetch:
        from pipeline.fetch_rain_forecast import main as fetch_forecast
        fetch_forecast()

    fc_path = RAIN_DIR / "forecast" / "latest.csv"
    fc_meta = json.loads((RAIN_DIR / "forecast" / "latest_meta.json").read_text())
    fc = pd.read_csv(fc_path, parse_dates=["time"])
    terrain, clim, hotspots = load_static()
    history = flood_history()
    n_reports = sum(h["reports"] for h in history.values())

    now = datetime.now(ZoneInfo(TIMEZONE))
    t0 = now.replace(tzinfo=None, minute=0, second=0, microsecond=0)

    def rain_for(hid, t, wname):
        h0, h1 = WINDOWS[wname]
        return rain_inputs(fc, t, t0 + timedelta(hours=h0), t0 + timedelta(hours=h1))

    results, counts = score_all(rain_for, list(WINDOWS), terrain, clim, hotspots, history)
    out = {
        "meta": {
            "run_id": now.strftime("%Y%m%dT%H%M"),
            "generated_at": now.isoformat(timespec="seconds"),
            "forecast_fetched_at": fc_meta["fetched_at"],
            "forecast_models": fc_meta["models"],
            "scored_with_model": MODEL,
            "windows": {w: {"start": (t0 + timedelta(hours=a)).isoformat(), "end": (t0 + timedelta(hours=b)).isoformat()}
                        for w, (a, b) in WINDOWS.items()},
            "method": "rules-v1",
            "method_doc": "docs/MODEL.md",
            "calibrated": False,
            "flood_reports": n_reports,
            "note": (f"Scores come from documented rules, not yet checked against past floods "
                     f"({n_reports} flood reports so far). They are not probabilities."),
            "counts": counts,
            "is_synthetic": False,
        },
        "hotspots": results,
    }
    FORECAST_DIR.mkdir(parents=True, exist_ok=True)
    archive = FORECAST_DIR / f"risk_{out['meta']['run_id']}.json"
    archive.write_text(json.dumps(out))
    shutil.copyfile(archive, LATEST_RISK)
    return out


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--fetch", action="store_true", help="fetch a fresh forecast first")
    out = run(fetch=p.parse_args().fetch)
    m = out["meta"]
    print(f"Wrote {LATEST_RISK} (forecast fetched {m['forecast_fetched_at']})")
    for w, c in m["counts"].items():
        print(f"  {w:<9} red {c['red']}  amber {c['amber']}  green {c['green']}")
    for r in out["hotspots"][:5]:
        if r["scored"]:
            w = r["windows"]["next_24h"]
            print(f"  {r['name'][:32]:<32} {w['level']:<6} score {w['score']:5.1f}  rain {w['rain']['rain_24h']} mm")


if __name__ == "__main__":
    main()
