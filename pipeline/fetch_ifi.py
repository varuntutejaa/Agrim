"""Gurugram events from the India Flood Inventory (public dataset).

Run from the repo root:
    python -m pipeline.fetch_ifi

Source: India Flood Inventory-Impacts (IFI-Impacts) [1967-2023], Saharia et
al., IIT Delhi, Zenodo record 11275211, licence CC-BY-4.0. Events are
recorded per district, mostly from IMD reports.

What it's good for in Agrim: dates when Gurugram district had a recorded
flood event. It does NOT say which hotspots flooded, so it isn't used as
training labels directly. Its dates guide the search for hotspot-level
reports (see data/incidents_candidates.csv).

Writes data/external/ifi_gurugram_events.csv (small, committed, attributed).
"""
import csv
import io

import pandas as pd
import requests

from pipeline.config import DATA_DIR, USER_AGENT

URL = "https://zenodo.org/records/11275211/files/India_Flood_Inventory_v3.csv?download=1"
OUT = DATA_DIR / "external" / "ifi_gurugram_events.csv"
ATTRIBUTION = ("India Flood Inventory-Impacts v3 (Saharia et al., IIT Delhi), "
               "https://zenodo.org/records/11275211, CC-BY-4.0")


def main():
    r = requests.get(URL, headers={"User-Agent": USER_AGENT}, timeout=120)
    r.raise_for_status()
    # pandas copes with the line breaks inside quoted description fields.
    df = pd.read_csv(io.BytesIO(r.content), encoding_errors="replace", dtype=str).fillna("")
    where = (df["Districts"] + " " + df["Location"]).str.lower()
    keep = []
    for _, row in df[where.str.contains("gurgaon|gurugram")].iterrows():
        n_districts = len([d for d in row["Districts"].split(",") if d.strip()])
        keep.append({"start_date": row["Start Date"][:10], "end_date": row["End Date"][:10],
                     "main_cause": row["Main Cause"], "n_districts": n_districts,
                     "event_source": row["Event Source"], "uei": row["UEI"], "attribution": ATTRIBUTION})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(keep[0]))
        w.writeheader()
        w.writerows(keep)
    print(f"Wrote {len(keep)} Gurugram events to {OUT}")
    for k in keep:
        print(f"  {k['start_date']} to {k['end_date']}  {k['main_cause']}  ({k['n_districts']} districts in the event)")


if __name__ == "__main__":
    main()
