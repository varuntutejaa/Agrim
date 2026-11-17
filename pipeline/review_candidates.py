"""Review candidate flood reports and move the good ones into data/incidents.csv.

Candidates (data/incidents_candidates.csv) are rows found in news coverage,
each with its source link. They are NOT training data until a team member
opens the link, checks the date and place, and accepts them here.

Run from the repo root:
    python -m pipeline.review_candidates            # go through pending ones, one by one
    python -m pipeline.review_candidates --list     # counts by status

Or review in a spreadsheet (quickest: the 48 rows come from only 10 articles,
so the sheet is sorted by article and you read each one once):
    python -m pipeline.review_candidates --export review.csv
    # open review.csv in Excel / Numbers / Google Sheets; in the "decision"
    # column write accept or reject (leave blank to decide later); save as CSV
    python -m pipeline.review_candidates --import review.csv --reviewer "Your Name" --dry-run
    python -m pipeline.review_candidates --import review.csv --reviewer "Your Name"

For each candidate: [a]ccept, [r]eject, [s]kip, [o]pen the link, [q]uit.
Accepted rows go through the same checks as add_incident (valid date, known
hotspot, link present, no duplicate).
"""
import argparse
import csv
import webbrowser

from pipeline.add_incident import COLUMNS as INCIDENT_COLUMNS, hotspot_ids, is_duplicate, validate
from pipeline.config import DATA_DIR, INCIDENTS_CSV

CANDIDATES_CSV = DATA_DIR / "incidents_candidates.csv"
CANDIDATE_COLUMNS = ["id", "date", "hotspot_id", "flooded", "depth_estimate", "duration_hours", "source_url",
                     "source_title", "evidence", "found_by", "status", "reviewed_by"]


def load() -> list[dict]:
    with CANDIDATES_CSV.open(newline="") as f:
        return list(csv.DictReader(f))


def save(rows: list[dict]):
    with CANDIDATES_CSV.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CANDIDATE_COLUMNS)
        w.writeheader()
        w.writerows(rows)


SHEET_COLUMNS = ["id", "decision", "note", "source_title", "date", "hotspot_id", "hotspot_name", "flooded",
                 "depth_estimate", "evidence", "source_url"]


def incident_row(r: dict, reviewer: str) -> dict:
    return {"date": r["date"], "hotspot_id": r["hotspot_id"], "flooded": r["flooded"],
            "depth_estimate": r["depth_estimate"], "duration_hours": r["duration_hours"],
            "source_url": r["source_url"], "added_by": reviewer, "notes": f"candidate #{r['id']}"}


def accept(r: dict, reviewer: str, known: dict) -> str | None:
    """Add a candidate to incidents.csv. Returns why not, or None if added."""
    row = incident_row(r, reviewer)
    problems = validate(row, known)
    if problems or is_duplicate(row):
        return "; ".join(problems) if problems else "already in incidents.csv"
    with INCIDENTS_CSV.open("a", newline="") as f:
        csv.DictWriter(f, fieldnames=INCIDENT_COLUMNS).writerow(row)
    r["status"], r["reviewed_by"] = "accepted", reviewer
    return None


def export_sheet(rows: list[dict], path: str):
    """Pending candidates as a review sheet, grouped by article."""
    known = hotspot_ids()
    pending = sorted((r for r in rows if r["status"] == "pending"), key=lambda r: (r["source_url"], r["date"], r["hotspot_id"]))
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=SHEET_COLUMNS)
        w.writeheader()
        for r in pending:
            w.writerow({**{k: r.get(k, "") for k in SHEET_COLUMNS}, "decision": "", "note": "",
                        "hotspot_name": known.get(r["hotspot_id"], "?")})
    print(f"{len(pending)} pending rows from {len({r['source_url'] for r in pending})} articles written to {path}.")
    print("Write accept or reject in the decision column, save as CSV, then run --import.")


def import_sheet(rows: list[dict], path: str, reviewer: str, dry_run: bool):
    known = hotspot_ids()
    by_id = {r["id"]: r for r in rows}
    counts = {"accepted": 0, "rejected": 0, "left pending": 0, "not added": 0}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for d in csv.DictReader(f):
            r = by_id.get(d.get("id", "").strip())
            decision = d.get("decision", "").strip().lower()
            if r is None or r["status"] != "pending" or decision not in ("accept", "reject"):
                counts["left pending"] += r is not None and r["status"] == "pending"
                continue
            if decision == "reject":
                counts["rejected"] += 1
                if not dry_run:
                    r["status"], r["reviewed_by"] = "rejected", reviewer
                continue
            if dry_run:
                row = incident_row(r, reviewer)
                problems = validate(row, known) or (["already in incidents.csv"] if is_duplicate(row) else [])
                if problems:
                    print(f"  #{r['id']}: would not be added: {'; '.join(problems)}")
                    counts["not added"] += 1
                else:
                    counts["accepted"] += 1
                continue
            why = accept(r, reviewer, known)
            if why:
                print(f"  #{r['id']}: not added: {why}")
                counts["not added"] += 1
            else:
                counts["accepted"] += 1
    if not dry_run:
        save(rows)
    print(("Dry run, nothing saved: " if dry_run else "Saved: ") + ", ".join(f"{v} {k}" for k, v in counts.items()))
    if not dry_run and counts["accepted"]:
        print("Next: python -m model.backtest   and   python -m model.train")


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--list", action="store_true")
    p.add_argument("--export", metavar="CSV", help="write a review sheet of the pending candidates")
    p.add_argument("--import", dest="import_", metavar="CSV", help="apply the decisions from a review sheet")
    p.add_argument("--reviewer", help="your name (needed with --import)")
    p.add_argument("--dry-run", action="store_true", help="with --import: show what would happen, save nothing")
    args = p.parse_args()
    rows = load()
    if args.export:
        export_sheet(rows, args.export)
        return
    if args.import_:
        if not args.reviewer or len(args.reviewer.strip()) < 2:
            p.error("--reviewer \"Your Name\" is needed with --import")
        import_sheet(rows, args.import_, args.reviewer.strip(), args.dry_run)
        return
    if args.list:
        for status in ("pending", "accepted", "rejected"):
            print(f"{status:<9} {sum(r['status'] == status for r in rows)}")
        return

    known = hotspot_ids()
    reviewer = input("Your name: ").strip()
    if len(reviewer) < 2:
        print("Name needed.")
        return
    for r in rows:
        if r["status"] != "pending":
            continue
        print("\n" + "-" * 72)
        print(f"#{r['id']}  {r['date']}  {r['hotspot_id']} ({known.get(r['hotspot_id'], '?')})  flooded={r['flooded']}"
              f"  depth={r['depth_estimate'] or '?'}")
        print(f"Source: {r['source_title']}\n        {r['source_url']}")
        print(f"What it says: {r['evidence']}")
        while True:
            choice = input("[a]ccept [r]eject [s]kip [o]pen [q]uit: ").strip().lower()
            if choice == "o":
                webbrowser.open(r["source_url"])
                continue
            break
        if choice == "q":
            break
        if choice == "r":
            r["status"], r["reviewed_by"] = "rejected", reviewer
        elif choice == "a":
            why = accept(r, reviewer, known)
            if why:
                print("Not added: " + why)
                continue
            print("Added to incidents.csv")
        save(rows)
    print("\nDone. Retrain with: python -m model.train")


if __name__ == "__main__":
    main()
