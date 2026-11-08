"""Import MCG data into Agrim when it is released (see docs/DATA_REQUIREMENTS.md).

Run from the repo root:
    python -m pipeline.import_mcg hotspots mcg_hotspots.csv
    python -m pipeline.import_mcg storm-reports mcg_storm_reports.csv --reference "MCG letter 123/2026"

hotspots       (D1) Adds or updates hotspots in data/hotspots.csv. A row whose name
               matches an existing hotspot updates it (zone, grade, exact pin);
               others are added with id MCG-<mcg_id>. MCG pins count as checked
               (verified = yes), so the geocoder never overwrites them.
storm-reports  (D2) Adds one row per point per storm to data/incidents.csv, both
               waterlogged and clear. Source is recorded as "mcg-data:<reference>".

Templates with the expected columns: data/templates/.
After importing hotspots, re-run: fetch_rain_history, model.climatology,
build_network, model.replay, model.run_forecast. After storm reports: model.train.
"""
import argparse
import csv
import re

from pipeline.add_incident import COLUMNS as INCIDENT_COLUMNS, validate
from pipeline.config import HOTSPOTS_CSV, INCIDENTS_CSV
from pipeline.geocode_hotspots import HOTSPOT_COLUMNS


def _key(name: str) -> str:
    """Name for matching: lower case, letters and digits only."""
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def _read(path) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def import_hotspots(src, hotspots_csv=HOTSPOTS_CSV) -> dict:
    rows = _read(hotspots_csv)
    by_name = {_key(r["name"]): r for r in rows}
    added = updated = 0
    for m in _read(src):
        name = m["name"].strip()
        try:
            lat, lon = float(m["lat"]), float(m["lon"])
        except (KeyError, ValueError):
            raise SystemExit(f"Bad or missing lat/lon for {name!r}")
        fields = {"zone": m.get("zone", "").strip(), "mcg_severity_grade": m.get("severity_grade", "").strip(),
                  "lat": f"{lat:.6f}", "lon": f"{lon:.6f}", "verified": "yes",
                  "geocode_status": "manual", "geocode_source": "mcg", "geocode_label": "MCG hotspot list"}
        row = by_name.get(_key(name))
        if row:
            row.update(fields)
            row["notes"] = (row["notes"] + "; " if row["notes"] else "") + f"Pin and grade from MCG list (MCG id {m['mcg_id']})"
            updated += 1
        else:
            row = {c: "" for c in HOTSPOT_COLUMNS}
            row.update(fields, id=f"MCG-{re.sub(r'[^A-Za-z0-9]', '', m['mcg_id'])}", name=name,
                       location_kind=m.get("location_kind", ""), notes="From MCG hotspot list")
            rows.append(row)
            by_name[_key(name)] = row
            added += 1
    with open(hotspots_csv, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HOTSPOT_COLUMNS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    return {"added": added, "updated": updated}


def import_storm_reports(src, reference: str, hotspots_csv=HOTSPOTS_CSV, incidents_csv=INCIDENTS_CSV) -> dict:
    if len(reference.strip()) < 3:
        raise SystemExit("--reference is required (e.g. the MCG letter or file name), so every label is traceable.")
    hotspots = _read(hotspots_csv)
    known = {h["id"]: h["name"] for h in hotspots}
    by_name = {_key(h["name"]): h["id"] for h in hotspots}
    existing = {(r["date"], r["hotspot_id"], r["source_url"]) for r in _read(incidents_csv)}
    source = f"mcg-data:{reference.strip()}"
    new, problems = [], []
    for n, m in enumerate(_read(src), start=2):
        hid = f"MCG-{re.sub(r'[^A-Za-z0-9]', '', m.get('mcg_id', ''))}" if m.get("mcg_id") else ""
        if hid not in known:
            hid = by_name.get(_key(m.get("name", "")), "")
        waterlogged = m.get("waterlogged", "").strip().lower()
        row = {"date": m.get("storm_date", "").strip(), "hotspot_id": hid,
               "flooded": {"yes": "yes", "y": "yes", "1": "yes", "no": "no", "n": "no", "0": "no"}.get(waterlogged, ""),
               "depth_estimate": f"{m['depth_cm']} cm" if m.get("depth_cm") else "",
               "duration_hours": m.get("duration_hours", "").strip(),
               "source_url": source, "added_by": "import_mcg", "notes": m.get("notes", "").strip()}
        errs = validate(row, known)
        if errs:
            problems.append(f"line {n}: " + "; ".join(errs))
        elif (row["date"], row["hotspot_id"], source) not in existing:
            new.append(row)
            existing.add((row["date"], row["hotspot_id"], source))
    with open(incidents_csv, "a", newline="") as f:
        csv.DictWriter(f, fieldnames=INCIDENT_COLUMNS).writerows(new)
    return {"added": len(new), "floods": sum(r["flooded"] == "yes" for r in new),
            "clear": sum(r["flooded"] == "no" for r in new), "problems": problems}


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hotspots")
    h.add_argument("file")
    s = sub.add_parser("storm-reports")
    s.add_argument("file")
    s.add_argument("--reference", required=True, help="MCG letter / file reference for traceability")
    args = p.parse_args()
    if args.cmd == "hotspots":
        print(import_hotspots(args.file))
        print("Next: fetch_rain_history, model.climatology, build_network, model.replay, model.run_forecast")
    else:
        out = import_storm_reports(args.file, args.reference)
        print(f"Added {out['added']} records ({out['floods']} waterlogged, {out['clear']} clear).")
        for prob in out["problems"]:
            print("  skipped " + prob)
        print("Next: python -m model.train")


if __name__ == "__main__":
    main()
