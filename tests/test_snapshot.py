"""Forecast snapshot: saved to the database, restored on a wiped server,
never overwritten by an older copy. Runs in a throwaway schema (see conftest)."""
import json

from api import scheduler, snapshot


def make_files(tmp_path, generated_at):
    files = {"forecast_csv": tmp_path / "latest.csv", "forecast_meta": tmp_path / "latest_meta.json",
             "risk": tmp_path / "latest_risk.json"}
    files["forecast_csv"].write_text("point_id,lat,lon,time,model,precip_mm\n")
    files["forecast_meta"].write_text(json.dumps({"fetched_at": generated_at}))
    files["risk"].write_text(json.dumps({"meta": {"generated_at": generated_at}, "hotspots": []}))
    return files


def test_push_then_restore_on_a_wiped_server(ops_db, tmp_path, monkeypatch):
    files = make_files(tmp_path, "2026-11-12T05:05:00+05:30")
    monkeypatch.setattr(snapshot, "FILES", files)
    assert snapshot.push() is True
    for p in files.values():          # the server restarts: disk wiped
        p.unlink()
    assert snapshot.pull() is True
    assert json.loads(files["risk"].read_text())["meta"]["generated_at"] == "2026-11-12T05:05:00+05:30"


def test_older_copy_never_replaces_newer(ops_db, tmp_path, monkeypatch):
    (tmp_path / "a").mkdir()
    new = make_files(tmp_path / "a", "2026-11-12T17:05:00+05:30")
    monkeypatch.setattr(snapshot, "FILES", new)
    assert snapshot.push() is True
    (tmp_path / "b").mkdir()
    old = make_files(tmp_path / "b", "2026-11-12T05:05:00+05:30")
    monkeypatch.setattr(snapshot, "FILES", old)
    assert snapshot.push() is False          # database keeps the newer run
    assert snapshot.pull() is True           # and the older local files get replaced
    assert "17:05" in json.loads(old["risk"].read_text())["meta"]["generated_at"]


def test_refused_fetch_starts_a_cooldown(monkeypatch):
    monkeypatch.setattr(scheduler, "_last_fetch_failure", {"t": 0.0})
    def refused(fetch):
        raise RuntimeError("Open-Meteo error 429")
    monkeypatch.setattr(scheduler, "run", refused)
    assert scheduler.run_now(fetch=True, reason="test") is None
    assert scheduler.fetch_cooling_down()
    calls = []
    monkeypatch.setattr(scheduler, "run", lambda fetch: calls.append(fetch))
    assert scheduler.run_now(fetch=True, reason="test") is None and calls == []   # skipped, no new request
