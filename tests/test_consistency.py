"""Figures written into pages and docs must match the data they come from."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_sensor_counts_match_the_proposed_network():
    counts = json.loads((ROOT / "data/synthetic/proposed_sensors.geojson").read_text())["meta"]["counts"]
    phrase = (f"{counts['rain_gauge']} rain gauges, {counts['drain_sensor']} drain-level sensors, "
              f"{counts['underpass_monitor']} underpass monitors")
    for path in ("web/src/components/DataPage.tsx", "docs/DATA_REQUIREMENTS.md"):
        assert phrase in (ROOT / path).read_text(), f"{path} should say: {phrase}"


def test_hotspot_counts_match_the_list():
    import csv
    rows = list(csv.DictReader(open(ROOT / "data/hotspots.csv")))
    on_map = sum(r["geocode_status"] == "found" for r in rows)
    assert (len(rows), on_map) == (21, 19), "update the '21 listed, 19 on the map' wording"
