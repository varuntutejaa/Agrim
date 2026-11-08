"""Checks that the rule-based score behaves as docs/MODEL.md says.

The climatology and terrain below are made-up test inputs (not real data);
they only exist to exercise the rules. Run:  python -m pytest -q
"""
from model import rules

# A spot whose monsoon record says 37 mm/24 h is a 1-in-100-hours event, 88 mm is 1-in-1000.
CLIM = {}
for var, vals in {
    "rain_24h": [0.5, 3, 12.5, 18.5, 37, 50, 88, 118],
    "peak1h_24h": [0.2, 1, 3, 5, 11.6, 14, 22, 30],
    "rain_72h": [3, 10, 30, 45, 90, 110, 150, 200],
}.items():
    for q, v in zip(rules.QUANTILES, vals):
        CLIM[f"{var}_q{q:g}"] = v

LOW_SPOT = {"relief_1km_m": -2.4, "hand_m": 0.0, "builtup_share_500m": 0.9,
            "max_drained_km2_150m": 17.0, "n_downstream": 0}
HIGH_GROUND = {"relief_1km_m": 3.0, "hand_m": 8.0, "builtup_share_500m": 0.3,
               "max_drained_km2_150m": 0.05, "n_downstream": 0}
HOTSPOT = {"mcg_severity_grade": ""}


def rain(total, peak, past=0.0):
    return {"rain_24h": total, "peak1h": peak, "upstream_rain_24h": total, "rain_past_72h": past}


def test_no_rain_never_floods():
    a = rules.assess(rain(0, 0, past=200), LOW_SPOT, CLIM, HOTSPOT)
    assert a["level"] == "green"
    assert a["scores"]["high"] < rules.FLOOD_SCORE


def test_extreme_rain_on_low_spot_is_red():
    a = rules.assess(rain(95, 25, past=40), LOW_SPOT, CLIM, HOTSPOT)
    assert a["level"] == "red" and a["outlook"] == "likely"
    assert len(a["drivers"]) == 3


def test_same_rain_is_less_risky_on_high_ground():
    low = rules.assess(rain(45, 12), LOW_SPOT, CLIM, HOTSPOT)["score"]
    high = rules.assess(rain(45, 12), HIGH_GROUND, CLIM, HOTSPOT)["score"]
    assert low > high


def test_possible_means_floods_only_in_high_scenario():
    # Find a rain amount where only the x1.4 scenario crosses the line.
    for total in range(10, 120):
        a = rules.assess(rain(total, total / 4), LOW_SPOT, CLIM, HOTSPOT)
        if a["outlook"] == "possible":
            assert a["level"] == "amber" and a["confidence"] == "low"
            assert a["scores"]["expected"] < rules.FLOOD_SCORE <= a["scores"]["high"]
            return
    raise AssertionError("no 'possible' case found")


def test_score_rises_with_rain():
    scores = [rules.assess(rain(t, t / 4), LOW_SPOT, CLIM, HOTSPOT)["score"] for t in (5, 20, 40, 80, 120)]
    assert scores == sorted(scores)


def test_mcg_grade_a_makes_likely_red():
    for total in range(10, 120):
        a = rules.assess(rain(total, total / 4), HIGH_GROUND | {"max_drained_km2_150m": 5.0}, CLIM, HOTSPOT)
        if a["outlook"] == "likely" and not a["high_impact"]:
            assert a["level"] == "amber"
            graded = rules.assess(rain(total, total / 4), HIGH_GROUND | {"max_drained_km2_150m": 5.0}, CLIM,
                                  {"mcg_severity_grade": "A"})
            assert graded["level"] == "red"
            return
    raise AssertionError("no likely-but-low-impact case found")


def test_how_often_wording():
    assert rules.how_often(2.0) == "about once a monsoon"
    assert "monsoons" in rules.how_often(3.0)
