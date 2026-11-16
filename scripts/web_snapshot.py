"""Save the stored copy that the web app shows while the free API wakes up.

The web app always asks the live API first. If it hasn't answered within a
second and a half (the free server sleeps when idle and takes up to a minute
to wake), the page shows this copy instead, labelled "Stored copy" with its
age, and swaps in live data as soon as it arrives. So no page is ever blank.

Run it before each web deploy. It only READS from the API (the one POST,
/simulate, runs a storm and saves nothing):

    python scripts/web_snapshot.py                                  # from the live API
    AGRIM_API=http://localhost:8000 python scripts/web_snapshot.py  # from a local API

Writes web/public/snapshot/*.json (served by Vercel next to the app).
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "public" / "snapshot"
API = os.getenv("AGRIM_API", "https://agrim-api.onrender.com").rstrip("/")
TIMEOUT_S = 120          # a sleeping free server takes up to a minute to answer

# file name -> API path (GET)
GETS = {
    "hotspots": "/hotspots",
    "forecast": "/forecast/latest",
    "rain": "/rain/latest",
    "critical": "/network/critical",
    "sensors": "/sensors/proposed",
    "simulate_events": "/simulate/events",
    "simulate_dates": "/simulate/dates",
    "backtest": "/backtest",
    "model_status": "/model/status",
}
DRAINAGE = {"network": "/network", "catchments": "/network/catchments",
            "streams": "/network/streams", "drains": "/network/drains"}


def call(path: str, body: dict | None = None, tries: int = 4):
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(1, tries + 1):
        req = urllib.request.Request(API + path, data=data, method="POST" if body is not None else "GET",
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt == tries:
                raise
            print(f"  {path}: {e}; retrying")
            time.sleep(3 * attempt)


def save(name: str, obj) -> None:
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    print(f"  {path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} KB")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Reading {API} (waking it if needed) ...")
    t0 = time.time()
    call("/health")
    print(f"  server answered after {time.time() - t0:.0f} s")
    for name, path in GETS.items():
        save(name, call(path))
    save("drainage", {k: call(p) for k, p in DRAINAGE.items()})
    # The simulator's opening storm, exactly as the web app asks for it.
    storm = json.loads((ROOT / "web" / "src" / "simDefaults.json").read_text())["storm"]
    save("simulate_default", call("/simulate", {"mode": "storm", **storm, "blocked": []}))
    forecast = json.loads((OUT / "forecast.json").read_text())
    save("meta", {"taken_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "api": API,
                  "forecast_generated_at": forecast["meta"]["generated_at"]})
    print(f"Done. Forecast in the copy was generated {forecast['meta']['generated_at']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
