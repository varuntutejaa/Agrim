"""MCG import checks, on temporary copies of the data files.

The MCG rows below are made-up test inputs (no such files exist yet); they
only exercise the importer and are never written to data/.
"""
import csv
import shutil

from pipeline import import_mcg
from pipeline.config import HOTSPOTS_CSV, INCIDENTS_CSV


def write(path, header, rows):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def test_hotspots_update_existing_and_add_new(tmp_path):
    hs = tmp_path / "hotspots.csv"
    shutil.copy(HOTSPOTS_CSV, hs)
    src = tmp_path / "mcg.csv"
    write(src, ["mcg_id", "name", "zone", "severity_grade", "lat", "lon", "location_kind"],
          [["17", "Hero Honda Chowk", "II", "extremely critical", "28.4361", "77.0102", "junction"],
           ["204", "Test Underpass", "IV", "moderate", "28.45", "77.05", "junction"]])
    out = import_mcg.import_hotspots(src, hotspots_csv=hs)
    assert out == {"added": 1, "updated": 1}
    rows = {r["id"]: r for r in csv.DictReader(open(hs))}
    assert rows["H002"]["zone"] == "II" and rows["H002"]["verified"] == "yes"
    assert rows["MCG-204"]["name"] == "Test Underpass"


def test_storm_reports_need_reference_and_keep_clear_points(tmp_path):
    inc = tmp_path / "incidents.csv"
    shutil.copy(INCIDENTS_CSV, inc)
    src = tmp_path / "storm.csv"
    write(src, ["storm_date", "mcg_id", "name", "waterlogged", "depth_cm", "duration_hours", "report_time", "notes"],
          [["2025-07-31", "", "Hero Honda Chowk", "yes", "60", "4", "", ""],
           ["2025-07-31", "", "Sector 39", "no", "", "", "", "checked, clear"],
           ["2025-07-31", "", "Nowhere Chowk", "yes", "", "", "", ""]])
    out = import_mcg.import_storm_reports(src, "MCG letter 1/2026", incidents_csv=inc)
    assert out["added"] == 2 and out["floods"] == 1 and out["clear"] == 1 and len(out["problems"]) == 1
    rows = list(csv.DictReader(open(inc)))
    assert all(r["source_url"] == "mcg-data:MCG letter 1/2026" for r in rows[-2:])
    again = import_mcg.import_storm_reports(src, "MCG letter 1/2026", incidents_csv=inc)
    assert again["added"] == 0   # no duplicates
