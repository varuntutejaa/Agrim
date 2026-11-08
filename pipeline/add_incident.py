"""Add a flood incident (a training label) to data/incidents.csv.

Every row must come from a real, linkable report (news article, MCG
bulletin, verified social post). Never invent rows: the competition
disqualifies fabricated data, and the model learns from these labels.

Interactive (asks question by question):
    python -m pipeline.add_incident

One line (handy when going through a pile of articles):
    python -m pipeline.add_incident --date 2025-07-31 --hotspot H002 --flooded yes \
        --depth "knee-deep" --hours 4 --url https://example.com/article --by Varun

List what is there:
    python -m pipeline.add_incident --list

"flooded = no" rows matter too: a report that a hotspot stayed clear during
heavy rain is as useful to the model as a flood report.
"""
import argparse
import csv
import sys
from datetime import date

from pipeline.config import HOTSPOTS_CSV, INCIDENTS_CSV

COLUMNS = ["date", "hotspot_id", "flooded", "depth_estimate", "duration_hours", "source_url", "added_by", "notes"]


def hotspot_ids() -> dict:
    with HOTSPOTS_CSV.open(newline="") as f:
        return {r["id"]: r["name"] for r in csv.DictReader(f)}


def validate(row: dict, known: dict) -> list:
    """Return a list of problems (empty list = row is fine)."""
    problems = []
    try:
        d = date.fromisoformat(row["date"])
        if d > date.today():
            problems.append("date is in the future")
    except ValueError:
        problems.append("date must be YYYY-MM-DD")
    if row["hotspot_id"] not in known:
        problems.append(f"unknown hotspot_id {row['hotspot_id']!r} (see data/hotspots.csv)")
    if row["flooded"] not in ("yes", "no"):
        problems.append("flooded must be yes or no")
    if row["duration_hours"]:
        try:
            if float(row["duration_hours"]) < 0:
                problems.append("duration_hours cannot be negative")
        except ValueError:
            problems.append("duration_hours must be a number (or blank if unknown)")
    if not row["source_url"].startswith(("http://", "https://")):
        problems.append("source_url is required and must be a link")
    return problems


def is_duplicate(row: dict) -> bool:
    with INCIDENTS_CSV.open(newline="") as f:
        return any(r["date"] == row["date"] and r["hotspot_id"] == row["hotspot_id"]
                   and r["source_url"] == row["source_url"] for r in csv.DictReader(f))


def ask(prompt: str, default: str = "") -> str:
    answer = input(f"{prompt}{f' [{default}]' if default else ''}: ").strip()
    return answer or default


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--date"); p.add_argument("--hotspot"); p.add_argument("--flooded")
    p.add_argument("--depth", default=""); p.add_argument("--hours", default="")
    p.add_argument("--url"); p.add_argument("--by", default=""); p.add_argument("--notes", default="")
    p.add_argument("--list", action="store_true", help="print existing incidents and exit")
    args = p.parse_args()

    known = hotspot_ids()

    if args.list:
        with INCIDENTS_CSV.open(newline="") as f:
            rows = list(csv.DictReader(f))
        for r in rows:
            print(f"{r['date']}  {r['hotspot_id']:<6} {known.get(r['hotspot_id'], '?'):<40} "
                  f"flooded={r['flooded']:<3}  {r['source_url']}")
        print(f"{len(rows)} incidents ({sum(r['flooded'] == 'yes' for r in rows)} floods)")
        return

    if args.date:  # one-line mode
        row = {"date": args.date, "hotspot_id": args.hotspot or "", "flooded": (args.flooded or "").lower(),
               "depth_estimate": args.depth, "duration_hours": args.hours, "source_url": args.url or "",
               "added_by": args.by, "notes": args.notes}
    else:  # interactive mode
        print("Hotspots: " + ", ".join(f"{k}={v}" for k, v in known.items()))
        row = {
            "date": ask("Date of the event (YYYY-MM-DD)"),
            "hotspot_id": ask("Hotspot id (e.g. H002)").upper(),
            "flooded": ask("Flooded? (yes/no)").lower(),
            "depth_estimate": ask("Depth estimate as reported (e.g. 'knee-deep', '1 ft'; blank if unknown)"),
            "duration_hours": ask("Duration in hours (blank if unknown)"),
            "source_url": ask("Source URL"),
            "added_by": ask("Your name"),
            "notes": ask("Notes (optional)"),
        }

    problems = validate(row, known)
    if problems:
        print("Not saved:\n  - " + "\n  - ".join(problems))
        sys.exit(1)
    if is_duplicate(row):
        print("Not saved: the same date + hotspot + source is already in the file.")
        sys.exit(1)

    with INCIDENTS_CSV.open("a", newline="") as f:
        csv.DictWriter(f, fieldnames=COLUMNS).writerow(row)
    print(f"Saved: {row['date']} {row['hotspot_id']} ({known[row['hotspot_id']]}) flooded={row['flooded']}")


if __name__ == "__main__":
    main()
