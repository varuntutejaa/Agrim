"""Flood labels for training: did this hotspot flood on this day?

Two real sources, nothing invented:
  report   data/incidents.csv: compiled by the team from news and other
           sources, every row with a source_url
  officer  post-rain reports from MCG officers on the desk (Neon database)

If both sources describe the same hotspot and day, the day counts as
flooded if any report says it flooded.
"""
import csv
from datetime import date

from pipeline.config import INCIDENTS_CSV


def from_incidents() -> list[dict]:
    with open(INCIDENTS_CSV, newline="") as f:
        return [{"date": r["date"], "hotspot_id": r["hotspot_id"], "flooded": r["flooded"] == "yes",
                 "source": "report"} for r in csv.DictReader(f) if r["flooded"] in ("yes", "no")]


def from_officers() -> list[dict]:
    """Officer feedback from the database, or [] if it isn't configured."""
    from api import db
    if not db.configured():
        return []
    from api import ops
    return [{"date": f["event_date"], "hotspot_id": f["hotspot_id"], "flooded": bool(f["flooded"]),
             "source": "officer"} for f in ops.feedback_log(limit=10000)]


def merge(rows: list[dict]) -> list[dict]:
    """One label per (date, hotspot): flooded if any source says so."""
    out: dict[tuple, dict] = {}
    for r in rows:
        key = (r["date"], r["hotspot_id"])
        cur = out.setdefault(key, {"date": r["date"], "hotspot_id": r["hotspot_id"], "flooded": False, "sources": []})
        cur["flooded"] = cur["flooded"] or r["flooded"]
        if r["source"] not in cur["sources"]:
            cur["sources"].append(r["source"])
    return sorted(out.values(), key=lambda r: (r["date"], r["hotspot_id"]))


def load_labels(include_officers: bool = True) -> list[dict]:
    rows = from_incidents() + (from_officers() if include_officers else [])
    for r in rows:
        date.fromisoformat(r["date"])  # fail loudly on a malformed date
    return merge(rows)
