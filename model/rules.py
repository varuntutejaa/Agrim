"""Tier A risk model: a transparent points score (works with zero flood labels).

Every number here is documented in docs/MODEL.md. They are starting values
chosen by the team, NOT fitted to past floods (there are no flood reports
yet). Recalibrate them once data/incidents.csv has events.

Score (0-100) = rain points + wet-ground points + terrain points
  A  Rain next 24 h on the spot ............ up to 35  (vs this spot's own history)
  B  Heaviest hour ......................... up to 20  (vs this spot's own history)
  C  Rain over the upstream area ........... up to 10  (scaled by how much area drains here)
  D  Ground already wet (last 72 h) ........ up to 10
  E  Terrain: low spot, near drain level,
     built-up, big upstream area ........... up to 25  (fixed per hotspot)

A hotspot "floods" in a scenario when its score >= FLOOD_SCORE. Terrain and
wet ground alone max out at 35, so nothing floods without forecast rain.

Each forecast is run as three scenarios: forecast rain x0.7 / x1.0 / x1.4.
  Likely   = floods in the expected (x1.0) and high (x1.4) scenarios
  Possible = floods only in the high scenario
  Red   = Likely and high impact (score >= RED_SCORE, or water flows on to
          another hotspot, or MCG severity grade A/1/High)
  Amber = Possible, or Likely with lower impact
  Green = no flooding in any scenario
"""
import math

import numpy as np

# --- Documented parameters ------------------------------------------------------
WEIGHTS = {"rain_24h": 35, "peak1h": 20, "upstream_rain": 10, "wet_ground": 10,
           "low_spot": 10, "drain_level": 5, "built_up": 5, "upstream_area": 5}
FLOOD_SCORE = 50
RED_SCORE = 65
SCENARIOS = {"low": 0.7, "expected": 1.0, "high": 1.4}
HIGH_IMPACT_GRADES = {"a", "1", "high", "h"}

# Rain rarity: points start at the 90th percentile of this spot's monsoon
# hours and are full at the 99.9th. Measured as e = -log10(1 - percentile):
# 90% -> 1, 99% -> 2, 99.9% -> 3.
RARITY_START, RARITY_FULL = 1.0, 3.0
QUANTILES = [0.5, 0.75, 0.9, 0.95, 0.99, 0.995, 0.999, 1.0]
_E = [-math.log10(1 - q) if q < 1 else 3.5 for q in QUANTILES]

# Terrain ranges (metres / km2) over which points go from 0 to full.
LOW_SPOT_M = (1.0, -3.0)          # relief vs 1 km surroundings: +1 m -> 0 pts, -3 m -> full
DRAIN_LEVEL_M = (5.0, 0.5)        # height above nearest drainage: 5 m -> 0, 0.5 m -> full
UPSTREAM_KM2 = (0.1, 50.0)        # drained area within 150 m (log scale)
UPSTREAM_RAIN_FULL_KM2 = 10.0     # upstream rain counts fully once >= 10 km2 drains here
MONSOON_DAYS = 122                # Jun-Sep, for "how often" wording

ACTIONS = {
    "red": "Move a pump here and clear gullies by T-12 h; test the pump at T-3 h.",
    "amber": "Clear gullies by T-12 h; keep a pump on standby nearby.",
    "green": "No action needed.",
}


# --- Helpers -------------------------------------------------------------------

def _ramp(x: float, zero_at: float, full_at: float) -> float:
    """0 at `zero_at`, 1 at `full_at`, linear in between (works for falling ranges too)."""
    if zero_at == full_at:
        return float(x >= full_at)
    return float(np.clip((x - zero_at) / (full_at - zero_at), 0, 1))


def exceedance(value: float, clim: dict, var: str) -> float:
    """How rare `value` is at this spot: e = -log10(1 - percentile), capped at 3.5."""
    xp = [clim[f"{var}_q{q:g}"] for q in QUANTILES]
    if value <= 0:
        return 0.0
    # Quantiles can repeat (many dry hours); keep the highest e for each value.
    xs, es = [], []
    for x, e in zip(xp, _E):
        if xs and x <= xs[-1]:
            xs[-1], es[-1] = x, e
        else:
            xs.append(x)
            es.append(e)
    return float(np.interp(value, xs, es, left=0.0, right=_E[-1]))


def how_often(e: float) -> str:
    """Plain wording for a rarity level, e.g. 'about 1 day a monsoon'."""
    days = (10 ** -e) * MONSOON_DAYS
    if e >= _E[-1]:
        return "more than any monsoon hour here since 2018"
    if days >= 1.5:
        return f"about {days:.0f} days a monsoon"
    if days >= 0.75:
        return "about once a monsoon"
    return f"about once in {1 / days:.0f} monsoons"


# --- The score -------------------------------------------------------------------

def terrain_points(t: dict) -> dict:
    """Fixed points from the terrain (data/network/hotspot_terrain.csv)."""
    area = max(t["max_drained_km2_150m"], 1e-6)
    return {
        "low_spot": WEIGHTS["low_spot"] * _ramp(t["relief_1km_m"], *LOW_SPOT_M),
        "drain_level": WEIGHTS["drain_level"] * _ramp(t["hand_m"], *DRAIN_LEVEL_M),
        "built_up": WEIGHTS["built_up"] * float(np.clip(t["builtup_share_500m"], 0, 1)),
        "upstream_area": WEIGHTS["upstream_area"] * _ramp(math.log10(area), *map(math.log10, UPSTREAM_KM2)),
    }


def rain_points(r: dict, t: dict, clim: dict, scale: float) -> tuple[dict, dict]:
    """Points from rain, with forecast rain multiplied by `scale`. Returns (points, rarity e-values)."""
    e = {
        "rain_24h": exceedance(r["rain_24h"] * scale, clim, "rain_24h"),
        "peak1h": exceedance(r["peak1h"] * scale, clim, "peak1h_24h"),
        "upstream_rain": exceedance(r["upstream_rain_24h"] * scale, clim, "rain_24h"),
        # Past rain has already fallen: not scaled.
        "wet_ground": exceedance(r["rain_past_72h"], clim, "rain_72h"),
    }
    share = min(1.0, t["max_drained_km2_150m"] / UPSTREAM_RAIN_FULL_KM2)
    pts = {k: WEIGHTS[k] * _ramp(v, RARITY_START, RARITY_FULL) for k, v in e.items()}
    pts["upstream_rain"] *= share
    return pts, e


def assess(rain: dict, terrain: dict, clim: dict, hotspot: dict) -> dict:
    """Risk for one hotspot and one time window.

    rain:    rain_24h, peak1h, upstream_rain_24h, rain_past_72h (mm; forecast or simulated)
    terrain: one row of hotspot_terrain.csv
    clim:    one row of rain_climatology.csv
    hotspot: one row of hotspots.csv (for the MCG severity grade)
    """
    tpts = terrain_points(terrain)
    scores, expected_pts, expected_e = {}, None, None
    for name, scale in SCENARIOS.items():
        rpts, e = rain_points(rain, terrain, clim, scale)
        scores[name] = round(sum(rpts.values()) + sum(tpts.values()), 1)
        if name == "expected":
            expected_pts, expected_e = {**rpts, **tpts}, e

    floods = {k: v >= FLOOD_SCORE for k, v in scores.items()}
    likely = floods["expected"] and floods["high"]
    possible = floods["high"] and not floods["expected"]
    grade = (hotspot.get("mcg_severity_grade") or "").strip().lower()
    high_impact = (scores["expected"] >= RED_SCORE or terrain["n_downstream"] > 0 or grade in HIGH_IMPACT_GRADES)

    if likely and high_impact:
        level = "red"
    elif likely or possible:
        level = "amber"
    else:
        level = "green"
    confidence = None
    if likely:
        confidence = "high" if floods["low"] else "medium"
    elif possible:
        confidence = "low"

    return {
        "level": level,
        "outlook": "likely" if likely else "possible" if possible else "unlikely",
        "confidence": confidence,
        "high_impact": bool(high_impact),
        "score": scores["expected"],
        "scores": scores,
        "points": {k: round(v, 1) for k, v in expected_pts.items()},
        "drivers": drivers(expected_pts, expected_e, rain, terrain),
        "action": ACTIONS[level],
    }


def drivers(pts: dict, e: dict, rain: dict, t: dict) -> list[str]:
    """The three biggest point contributors, in plain words."""
    text = {
        "rain_24h": lambda: f"{rain['rain_24h']:.0f} mm of rain forecast in 24 h ({how_often(e['rain_24h'])} here)",
        "peak1h": lambda: f"Heaviest hour {rain['peak1h']:.0f} mm ({how_often(e['peak1h'])} here)",
        "upstream_rain": lambda: f"{rain['upstream_rain_24h']:.0f} mm forecast over the area that drains here",
        "wet_ground": lambda: f"Ground already wet: {rain['rain_past_72h']:.0f} mm in the last 3 days",
        "low_spot": lambda: f"Sits {abs(t['relief_1km_m']):.1f} m below its surroundings",
        "drain_level": lambda: ("Level with the nearest drain line" if t["hand_m"] < 0.1
                                else f"Only {t['hand_m']:.1f} m above the nearest drain line"),
        "built_up": lambda: f"{t['builtup_share_500m']:.0%} of the ground nearby is built over",
        "upstream_area": lambda: f"{t['max_drained_km2_150m']:.1f} km² of land drains towards it",
    }
    top = sorted((k for k in pts if pts[k] > 0.5), key=lambda k: -pts[k])[:3]
    return [text[k]() for k in top]
