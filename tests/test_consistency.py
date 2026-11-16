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
    page = (ROOT / "web/src/components/about/SensorsPage.tsx").read_text()
    doc = (ROOT / "docs/SENSORS.md").read_text()
    for kind, label in (("rain_gauge", "Rain gauge station"), ("drain_sensor", "Drain water-level station"),
                        ("underpass_monitor", "Underpass monitor")):
        assert f'["{label}", "{counts[kind]}"' in page, f"SensorsPage count for {label}"
        assert f"| {label} | {counts[kind]} |" in doc, f"docs/SENSORS.md count for {label}"
    assert str(sum(counts.values())) in page and str(sum(counts.values())) in doc


def test_sensor_costs_stay_unsourced_until_sourced():
    """No invented costs: every cost cell in docs/SENSORS.md is TODO until a source is added."""
    rows = [r for r in (ROOT / "docs/SENSORS.md").read_text().split("## 6.")[1].splitlines() if r.startswith("| ") and "---" not in r][1:]
    for r in rows:
        cells = [c.strip() for c in r.strip("|").split("|")]
        unit, total = cells[1], cells[3]
        assert unit in ("", "TODO") and total in ("", "TODO", "**TODO**"), f"cost without a source: {r}"


def test_hotspot_counts_match_the_list():
    import csv
    rows = list(csv.DictReader(open(ROOT / "data/hotspots.csv")))
    on_map = sum(r["geocode_status"] == "found" for r in rows)
    assert (len(rows), on_map) == (21, 19), "update the '21 listed, 19 on the map' wording"
