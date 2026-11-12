"""Keep the latest forecast in the database, so a restart or a refused weather
request never leaves the site blank.

Why: the free Render server's disk is wiped whenever it restarts or wakes from
sleep, and Open-Meteo sometimes refuses requests from Render's shared internet
address (HTTP 429). So after every successful forecast run, the three forecast
files are saved to Neon; a server without them restores the newest copy.

Anything that can reach Open-Meteo and the database can refresh the snapshot:
the server's own scheduler, the GitHub Actions job (.github/workflows/forecast.yml),
or a laptop:

    python -m model.run_forecast --fetch && python -m api.snapshot push
    python -m api.snapshot pull        # restore the newest copy locally
    python -m api.snapshot status
"""
import argparse
import gzip
import json
import time
from datetime import datetime

from api import db
from model.run_forecast import LATEST_RISK
from pipeline.config import RAIN_DIR

KEY = "latest_forecast"
FILES = {
    "forecast_csv": RAIN_DIR / "forecast" / "latest.csv",
    "forecast_meta": RAIN_DIR / "forecast" / "latest_meta.json",
    "risk": LATEST_RISK,
}
CHECK_EVERY_S = 600      # how often a running server looks for a newer snapshot
_last_check = {"t": 0.0}


def _local_generated_at() -> datetime | None:
    if not FILES["risk"].exists():
        return None
    return datetime.fromisoformat(json.loads(FILES["risk"].read_text())["meta"]["generated_at"])


def push() -> bool:
    """Save the local forecast files, unless the database already has a newer copy."""
    if not db.configured() or not all(p.exists() for p in FILES.values()):
        return False
    generated = _local_generated_at()
    body = gzip.compress(json.dumps({k: p.read_text() for k, p in FILES.items()}).encode())
    with db.connect() as conn:
        row = conn.execute(db.q(
            """INSERT INTO {snapshots} (key, generated_at, body) VALUES (%s, %s, %s)
               ON CONFLICT (key) DO UPDATE SET generated_at = EXCLUDED.generated_at, body = EXCLUDED.body,
                                               updated_at = now()
               WHERE {snapshots}.generated_at < EXCLUDED.generated_at
               RETURNING key"""), (KEY, generated, body)).fetchone()
    return row is not None


def pull(force: bool = False) -> bool:
    """Restore the database copy if it is newer than the local files. True if restored."""
    if not db.configured():
        return False
    local = _local_generated_at()
    with db.connect() as conn:
        meta = conn.execute(db.q("SELECT generated_at FROM {snapshots} WHERE key = %s"), (KEY,)).fetchone()
        if meta is None or (not force and local is not None and local >= meta["generated_at"]):
            return False
        row = conn.execute(db.q("SELECT body FROM {snapshots} WHERE key = %s"), (KEY,)).fetchone()
    files = json.loads(gzip.decompress(row["body"]).decode())
    for name, path in FILES.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(files[name])
        tmp.replace(path)      # atomic: readers never see a half-written file
    return True


def pull_if_due() -> bool:
    """Cheap periodic check for a newer snapshot (at most every CHECK_EVERY_S)."""
    now = time.monotonic()
    if now - _last_check["t"] < CHECK_EVERY_S:
        return False
    _last_check["t"] = now
    try:
        return pull()
    except Exception:  # the database being briefly unreachable must not break the page
        return False


def status() -> dict:
    with db.connect() as conn:
        row = conn.execute(db.q("SELECT generated_at, updated_at, length(body) AS bytes FROM {snapshots} WHERE key = %s"),
                           (KEY,)).fetchone()
    return {"local": str(_local_generated_at()), "database": {k: str(v) for k, v in row.items()} if row else None}


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("action", choices=["push", "pull", "status"])
    a = p.parse_args().action
    if a == "push":
        print("Saved to the database." if push() else "Not saved (no local files, no DATABASE_URL, or the database copy is newer).")
    elif a == "pull":
        print("Restored from the database." if pull(force=True) else "Nothing to restore.")
    else:
        print(json.dumps(status(), indent=2))


if __name__ == "__main__":
    main()
