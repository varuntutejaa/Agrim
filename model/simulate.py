"""The simulator: run the same rules on rain the presenter chooses.

Two modes (both used by POST /simulate):
  storm   rain amount, heaviest hour and wet ground set by sliders; either
          even across the city or centred on a point (rain falls off with
          distance, so the map shows uneven rain)
  replay  a past monsoon day from the ECMWF record (data/model/replay_days.csv)

Results have the same shape as the live forecast, with one window
("next_24h"), and are always marked as an exercise, never a live warning.
Nothing here is stored or presented as real data.
"""
import csv
import json
import math
from functools import lru_cache

from model import rules
from model.replay import REPLAY_DAYS_CSV, REPLAY_EVENTS_JSON
from model.run_forecast import flood_history, load_static, score_all
from pipeline.config import NETWORK_DIR
from pipeline.fetch_rain_forecast import build_grid

WINDOW = "next_24h"
EXERCISE_LABEL = "EXERCISE / अभ्यास"
EXERCISE_NOTE_EN = "Simulation for planning and training. Not a live flood warning."
EXERCISE_NOTE_HI = "यह अभ्यास है, वास्तविक बाढ़ चेतावनी नहीं।"

LIMITS = {"rain_24h": (0, 300), "peak1h": (0, 150), "past_72h": (0, 400), "radius_km": (1, 30)}


@lru_cache(maxsize=1)
def _static():
    terrain, clim, hotspots = load_static()
    nodes = json.loads((NETWORK_DIR / "network.json").read_text())["nodes"]["features"]
    where = {f["properties"]["id"]: tuple(f["geometry"]["coordinates"]) for f in nodes}   # (lon, lat)
    grid = {p["point_id"]: (p["lon"], p["lat"]) for p in build_grid()}
    return terrain, clim, hotspots, where, grid


@lru_cache(maxsize=1)
def _replay_days() -> dict:
    out = {}
    with open(REPLAY_DAYS_CSV, newline="") as f:
        for r in csv.DictReader(f):
            out.setdefault(r["date"], {})[r["id"]] = {k: float(r[k]) for k in ("rain_24h", "peak1h", "past_72h")}
    return out


def replay_events() -> dict:
    return json.loads(REPLAY_EVENTS_JSON.read_text())


def replay_dates() -> list[str]:
    return sorted(_replay_days())


def _km(a, b) -> float:
    """Distance in km between two (lon, lat) points (flat-earth, fine at city scale)."""
    kx = 111.32 * math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 110.57)


def _clamp(name, v) -> float:
    lo, hi = LIMITS[name]
    return float(min(max(v, lo), hi))


def _result(results, counts, meta) -> dict:
    return {
        "meta": {
            "is_simulation": True,
            "exercise_label": EXERCISE_LABEL,
            "note": EXERCISE_NOTE_EN,
            "note_hi": EXERCISE_NOTE_HI,
            "method": "rules-v1",
            "calibrated": False,
            "counts": counts,
            "is_synthetic": True,   # simulated rain is not an observation
            **meta,
        },
        "hotspots": results,
    }


def run_storm(rain_24h: float, peak1h: float, past_72h: float,
              centre: tuple[float, float] | None = None, radius_km: float = 6.0) -> dict:
    """Rain set by hand. `centre` = (lon, lat) for a local storm, None for even rain."""
    terrain, clim, hotspots, where, grid = _static()
    rain_24h = _clamp("rain_24h", rain_24h)
    peak1h = min(_clamp("peak1h", peak1h), rain_24h)     # one hour can't exceed the day
    past_72h = _clamp("past_72h", past_72h)
    radius_km = _clamp("radius_km", radius_km)

    def factor(pt) -> float:
        if centre is None:
            return 1.0
        return math.exp(-0.5 * (_km(pt, centre) / radius_km) ** 2)

    def rain_for(hid, t, _w):
        f = factor(where[hid])
        up = [factor(grid[p]) for p in t["upstream_grid_points"] if p in grid] or [f]
        return {"rain_24h": round(rain_24h * f, 1), "peak1h": round(peak1h * f, 1),
                "upstream_rain_24h": round(rain_24h * sum(up) / len(up), 1),
                "rain_past_72h": past_72h, "rain_24h_by_model": {}, "wet_window": None}

    results, counts = score_all(rain_for, [WINDOW], terrain, clim, hotspots, flood_history())
    # How unusual the chosen rain is, against a typical hotspot's record (the median one).
    typical = sorted(clim.values(), key=lambda c: c["rain_24h_q0.99"])[len(clim) // 2]
    rarity = {"rain_24h": rules.how_often(rules.exceedance(rain_24h, typical, "rain_24h")),
              "peak1h": rules.how_often(rules.exceedance(peak1h, typical, "peak1h_24h"))}
    return _result(results, counts, {
        "mode": "storm",
        "rarity": rarity,
        "params": {"rain_24h": rain_24h, "peak1h": peak1h, "past_72h": past_72h,
                   "centre": list(centre) if centre else None, "radius_km": radius_km},
    })


def run_replay(date: str) -> dict:
    """Replay a past monsoon day from the ECMWF record."""
    terrain, clim, hotspots, _, _ = _static()
    days = _replay_days()
    if date not in days:
        raise ValueError(f"No rain on record for {date} (monsoon days 2018–2026 with rain only)")
    day = days[date]

    def rain_for(hid, t, _w):
        own = day.get(hid, {"rain_24h": 0.0, "peak1h": 0.0, "past_72h": 0.0})
        # Upstream rain: average over this hotspot and the hotspots upstream of it.
        ups = [day[u]["rain_24h"] for u in [hid, *t["upstream_ids"]] if u in day]
        return {"rain_24h": own["rain_24h"], "peak1h": own["peak1h"],
                "upstream_rain_24h": round(sum(ups) / len(ups), 1) if ups else own["rain_24h"],
                "rain_past_72h": own["past_72h"], "rain_24h_by_model": {}, "wet_window": None}

    results, counts = score_all(rain_for, [WINDOW], terrain, clim, hotspots, flood_history())
    event = next((e for e in replay_events()["events"] if e["date"] == date), None)
    return _result(results, counts, {
        "mode": "replay",
        "params": {"date": date},
        "event": event,
        "source": "ECMWF IFS record via Open-Meteo (model rain, not rain-gauge readings)",
    })
