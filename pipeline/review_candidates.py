"""Review candidate flood reports and move the good ones into data/incidents.csv.

Candidates (data/incidents_candidates.csv) are rows found in news coverage,
each with its source link. They are NOT training data until a team member
opens the link, checks the date and place, and accepts them here.

Run from the repo root:
    python -m pipeline.review_candidates            # go through pending ones
    python -m pipeline.review_candidates --list     # counts by status

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


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--list", action="store_true")
    args = p.parse_args()
    rows = load()
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
            row = {"date": r["date"], "hotspot_id": r["hotspot_id"], "flooded": r["flooded"],
                   "depth_estimate": r["depth_estimate"], "duration_hours": r["duration_hours"],
                   "source_url": r["source_url"], "added_by": reviewer, "notes": f"candidate #{r['id']}"}
            problems = validate(row, known)
            if problems or is_duplicate(row):
                print("Not added: " + ("; ".join(problems) if problems else "already in incidents.csv"))
                continue
            with INCIDENTS_CSV.open("a", newline="") as f:
                csv.DictWriter(f, fieldnames=INCIDENT_COLUMNS).writerow(row)
            r["status"], r["reviewed_by"] = "accepted", reviewer
            print("Added to incidents.csv")
        save(rows)
    print("\nDone. Retrain with: python -m model.train")


if __name__ == "__main__":
    main()
