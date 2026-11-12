"""Checks for the review items: model-agreement confidence, critical points,
'block a drain', the backtest gate and the proposed sensors."""
import json

from model import backtest, rules, simulate
from pipeline import critical_nodes
from pipeline.config import NETWORK_DIR, SYNTHETIC_DIR
from tests.test_rules import CLIM, HOTSPOT, LOW_SPOT, rain


def test_all_models_agree_means_likely():
    wet = rain(95, 25, 40)
    a = rules.assess(wet, LOW_SPOT, CLIM, HOTSPOT, model_rains={"a": wet, "b": wet, "c": wet})
    assert a["outlook"] == "likely" and a["confidence"] == "high"
    assert a["models"]["flooding"] == 3 and a["confidence_basis"] == "models"


def test_some_models_means_possible():
    wet, dry = rain(95, 25, 40), rain(2, 1, 0)
    two = rules.assess(wet, LOW_SPOT, CLIM, HOTSPOT, model_rains={"a": wet, "b": wet, "c": dry})
    one = rules.assess(wet, LOW_SPOT, CLIM, HOTSPOT, model_rains={"a": wet, "b": dry, "c": dry})
    assert two["outlook"] == "possible" and two["confidence"] == "medium" and two["level"] == "amber"
    assert one["outlook"] == "possible" and one["confidence"] == "low"
    none = rules.assess(dry, LOW_SPOT, CLIM, HOTSPOT, model_rains={"a": dry, "b": dry, "c": dry})
    assert none["level"] == "green" and none["models"]["flooding"] == 0


def test_critical_points_rank_by_hotspots_served():
    nodes = json.loads((NETWORK_DIR / "network.json").read_text())["nodes"]["features"]
    out = critical_nodes.build(nodes)
    top = out["features"][0]["properties"]
    assert top["n_hotspots"] == max(f["properties"]["n_hotspots"] for f in out["features"])
    s = out["summary"]
    assert s["priority_covers"] >= 0.8 * s["n_hotspots"]
    assert [c["hotspots"] for c in s["curve"]] == sorted(c["hotspots"] for c in s["curve"])


def test_blocking_a_drain_raises_risk_upstream_of_it():
    top = json.loads((NETWORK_DIR / "critical_nodes.geojson").read_text())["features"][0]["properties"]
    base = simulate.run_storm(40, 10, 20)
    blocked = simulate.run_storm(40, 10, 20, blocked=[top["id"]])
    score = lambda r, hid: next(h for h in r["hotspots"] if h["id"] == hid)["windows"]["next_24h"]["score"]
    for hid in top["hotspots"]:
        assert score(blocked, hid) > score(base, hid)
    assert blocked["meta"]["blocked"][0]["id"] == top["id"]


def test_backtest_publishes_reviewed_labels_only():
    public = backtest.run(candidates=False)
    assert public["reviewed_only"] is True
    preview = backtest.run(candidates=True)
    assert preview["reviewed_only"] is False and preview["n"] >= public["n"]
    assert all(r["reason"] for r in preview["rows"] if r["outcome"] == "missed")


def test_proposed_sensors_are_flagged_illustrative():
    fc = json.loads((SYNTHETIC_DIR / "proposed_sensors.geojson").read_text())
    assert fc["meta"]["is_synthetic"] is True
    assert fc["meta"]["counts"] == {"rain_gauge": 25, "drain_sensor": 43, "underpass_monitor": 8}
    assert all(f["properties"]["status"] == "proposed" for f in fc["features"])
