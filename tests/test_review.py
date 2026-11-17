"""The spreadsheet review of news candidates: export, then import decisions."""
import csv
import shutil

from pipeline import review_candidates as rc
from pipeline.config import DATA_DIR


def test_export_then_import(tmp_path, monkeypatch):
    cands, incidents = tmp_path / "cands.csv", tmp_path / "incidents.csv"
    shutil.copy(DATA_DIR / "incidents_candidates.csv", cands)
    shutil.copy(DATA_DIR / "incidents.csv", incidents)
    monkeypatch.setattr(rc, "CANDIDATES_CSV", cands)
    monkeypatch.setattr(rc, "INCIDENTS_CSV", incidents)
    import pipeline.add_incident as ai
    monkeypatch.setattr(ai, "INCIDENTS_CSV", incidents)

    sheet = tmp_path / "sheet.csv"
    rows = rc.load()
    pending = [r for r in rows if r["status"] == "pending"]
    rc.export_sheet(rows, str(sheet))
    out = list(csv.DictReader(open(sheet)))
    assert len(out) == len(pending)
    assert [r["source_url"] for r in out] == sorted(r["source_url"] for r in out)   # grouped by article

    # Accept the first row, reject the second, leave the rest blank.
    out[0]["decision"], out[1]["decision"] = "accept", "Reject"
    with open(sheet, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=rc.SHEET_COLUMNS)
        w.writeheader()
        w.writerows(out)

    rc.import_sheet(rc.load(), str(sheet), "Tester", dry_run=True)
    assert all(r["status"] == "pending" for r in rc.load())                          # dry run saves nothing

    rc.import_sheet(rc.load(), str(sheet), "Tester", dry_run=False)
    after = {r["id"]: r for r in rc.load()}
    assert after[out[0]["id"]]["status"] == "accepted" and after[out[0]["id"]]["reviewed_by"] == "Tester"
    assert after[out[1]["id"]]["status"] == "rejected"
    assert sum(r["status"] == "pending" for r in after.values()) == len(pending) - 2
    added = list(csv.DictReader(open(incidents)))
    assert len(added) == 1 and added[0]["notes"] == f"candidate #{out[0]['id']}"


def test_backtest_keeps_unreviewed_reports_apart(monkeypatch):
    """The published result uses reviewed reports only; pending news reports come
    separately, labelled unreviewed, and stop being previewed once reviewed."""
    monkeypatch.setenv("DATABASE_URL", "")
    from api import main
    out = main.backtest()
    p = out["unreviewed_preview"]
    assert out["reviewed_only"] is True
    if out["candidates_pending"]:
        assert p["reviewed"] is False and p["label"].startswith("Unreviewed")
        assert p["caught"] + p["missed"] == p["n"]
        assert all(d["caught"] + d["missed"] > 0 for d in p["days"])
    else:
        assert p is None
