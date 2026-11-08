"""Features for the machine-learning model (Tier B), one row per hotspot and day.

The same function builds features for training (past days, from the ECMWF
record) and for prediction (forecast or simulated rain), so the model always
sees inputs computed the same way.

Features
  rain_24h, peak1h, upstream_rain_24h, rain_past_72h   rain, mm (model-scale)
  e_rain_24h, e_peak1h, e_wet_ground                  how rare that rain is at this
                                                      hotspot (-log10 of 1 - percentile)
  relief_1km_m, hand_m, builtup_share_500m,
  max_drained_km2_150m, n_upstream                    terrain (data/network)
  rule_score                                          the Tier A score, so the model
                                                      starts from the rules and learns
                                                      corrections to them
"""
from datetime import date

from model import rules

FEATURES = [
    "rain_24h", "peak1h", "upstream_rain_24h", "rain_past_72h",
    "e_rain_24h", "e_peak1h", "e_wet_ground",
    "relief_1km_m", "hand_m", "builtup_share_500m", "max_drained_km2_150m", "n_upstream",
    "rule_score",
]

# Plain words for each feature, used to explain predictions.
LABELS = {
    "rain_24h": lambda v: f"{v:.0f} mm of rain in 24 h",
    "peak1h": lambda v: f"heaviest hour {v:.0f} mm",
    "upstream_rain_24h": lambda v: f"{v:.0f} mm over the area that drains here",
    "rain_past_72h": lambda v: f"{v:.0f} mm in the 3 days before",
    "e_rain_24h": lambda v: "how unusual the day's rain is here",
    "e_peak1h": lambda v: "how unusual the heaviest hour is here",
    "e_wet_ground": lambda v: "how wet the ground already is",
    "relief_1km_m": lambda v: f"sits {abs(v):.1f} m {'below' if v < 0 else 'above'} its surroundings",
    "hand_m": lambda v: f"{max(v, 0):.1f} m above the nearest drain line",
    "builtup_share_500m": lambda v: f"{v:.0%} built-up nearby",
    "max_drained_km2_150m": lambda v: f"{v:.1f} km² drains towards it",
    "n_upstream": lambda v: f"{v:.0f} upstream hotspots feed it",
    "rule_score": lambda v: f"rule score {v:.0f}/100",
}


def feature_row(rain: dict, terrain: dict, clim: dict, hotspot: dict) -> dict:
    """Features for one hotspot and day.

    rain: rain_24h, peak1h, upstream_rain_24h, rain_past_72h (mm)
    """
    return {
        "rain_24h": rain["rain_24h"],
        "peak1h": rain["peak1h"],
        "upstream_rain_24h": rain["upstream_rain_24h"],
        "rain_past_72h": rain["rain_past_72h"],
        "e_rain_24h": rules.exceedance(rain["rain_24h"], clim, "rain_24h"),
        "e_peak1h": rules.exceedance(rain["peak1h"], clim, "peak1h_24h"),
        "e_wet_ground": rules.exceedance(rain["rain_past_72h"], clim, "rain_72h"),
        "relief_1km_m": terrain["relief_1km_m"],
        "hand_m": terrain["hand_m"],
        "builtup_share_500m": terrain["builtup_share_500m"],
        "max_drained_km2_150m": terrain["max_drained_km2_150m"],
        "n_upstream": float(len(terrain.get("upstream_ids", []))),
        "rule_score": rules.assess(rain, terrain, clim, hotspot)["score"],
    }


def record_covers(day: date, record_dates: set[str]) -> bool:
    """True if the ECMWF record (monsoon months of the years we have) covers this day.

    Inside that range, a day missing from the replay table genuinely had
    under 1 mm of rain at every hotspot, so it can be treated as dry.
    """
    years = {d[:4] for d in record_dates}
    return 6 <= day.month <= 9 and str(day.year) in years and day.isoformat() <= max(record_dates)


def past_day_rain(day_rows: dict | None, hotspot_id: str, upstream_ids: list[str]) -> dict:
    """Rain inputs for a past day from the replay table (None row = a dry day)."""
    day_rows = day_rows or {}
    own = day_rows.get(hotspot_id, {"rain_24h": 0.0, "peak1h": 0.0, "past_72h": 0.0})
    ups = [day_rows[u]["rain_24h"] for u in [hotspot_id, *upstream_ids] if u in day_rows]
    return {"rain_24h": own["rain_24h"], "peak1h": own["peak1h"],
            "upstream_rain_24h": sum(ups) / len(ups) if ups else own["rain_24h"],
            "rain_past_72h": own["past_72h"]}
