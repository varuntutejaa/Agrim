"""Geocode the seed hotspot list into data/hotspots.csv.

Run from the repo root:
    python -m pipeline.geocode_hotspots            # uses cached lookups
    python -m pipeline.geocode_hotspots --refresh  # ignore the cache

How it works
1. Read data/hotspots_seed.csv (names + search strings; no coordinates).
2. For each hotspot, ask OSM Nominatim, limited to the Gurugram box and to
   results whose address mentions Gurugram/Gurgaon.
3. If Nominatim finds nothing, search OSM names directly via Overpass.
4. If both fail, leave lat/lon EMPTY. We never guess coordinates.

Safe to re-run: rows the team has checked (verified = yes) or pinned by hand
(geocode_source = manual) are never overwritten. Rows that exist in
hotspots.csv but not in the seed file (e.g. MCG's full list of 159) are kept
as they are.

Columns of hotspots.csv
  id, name, zone, mcg_severity_grade, lat, lon   -> the MCG schema
  verified        "" = not checked yet, "yes" = a person confirmed the pin,
                  "no" = pin is wrong and needs fixing
  location_kind   junction / road / area (roads and areas need a precise pin)
  geocode_status  found / name_mismatch / not_found / manual
  geocode_source  nominatim / overpass / manual
  geocode_label   what the geocoder actually matched, for a human to check
  notes
"""
import argparse
import csv
import hashlib
import json
import re
import time

import requests

from pipeline.config import (
    BBOX, CACHE_DIR, HOTSPOTS_CSV, HOTSPOTS_SEED_CSV, USER_AGENT, in_bbox,
)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
GEOCODE_CACHE = CACHE_DIR / "geocode"

HOTSPOT_COLUMNS = [
    "id", "name", "zone", "mcg_severity_grade", "lat", "lon", "verified",
    "location_kind", "geocode_status", "geocode_source", "geocode_label", "notes",
]

# Words ignored when checking that the match really carries the hotspot's name.
GENERIC_WORDS = {"gurugram", "gurgaon", "road", "chowk", "lane", "service", "near", "the"}


def cached_get(key: str, fetch, refresh: bool):
    """Return a cached JSON response for `key`, or call fetch() and cache it."""
    GEOCODE_CACHE.mkdir(parents=True, exist_ok=True)
    path = GEOCODE_CACHE / (hashlib.sha1(key.encode()).hexdigest() + ".json")
    if path.exists() and not refresh:
        return json.loads(path.read_text())
    data = fetch()
    path.write_text(json.dumps(data))
    return data


def nominatim_search(query: str, refresh: bool) -> list:
    """Nominatim results inside the study box. Waits 1.1 s per live call (usage policy)."""
    south, west, north, east = BBOX
    params = {
        "q": query, "format": "jsonv2", "limit": 5, "countrycodes": "in",
        "viewbox": f"{west},{north},{east},{south}", "bounded": 1,
    }

    def fetch():
        time.sleep(1.1)
        r = requests.get(NOMINATIM_URL, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
        r.raise_for_status()
        return r.json()

    return cached_get("nominatim:" + query, fetch, refresh)


def overpass_search(name_regex: str, refresh: bool) -> list:
    """OSM features whose name matches the regex, inside the study box."""
    south, west, north, east = BBOX
    query = (
        f'[out:json][timeout:60];'
        f'nwr["name"~"{name_regex}",i]({south},{west},{north},{east});'
        f'out center 20;'
    )

    def fetch():
        r = requests.post(OVERPASS_URL, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=90)
        r.raise_for_status()
        return r.json().get("elements", [])

    return cached_get("overpass:" + name_regex, fetch, refresh)


def name_matches(query: str, label: str) -> bool:
    """True if every meaningful word of the search string appears in the matched label.

    Numbers must follow the word before them, so "Sector 15" does not match
    "Block I, 15, ..., Sector 49".
    """
    words = [w for w in query.lower().split() if w not in GENERIC_WORDS]
    label = label.lower()
    for i, word in enumerate(words):
        pattern = re.escape(word)
        if word.isdigit() and i > 0:
            pattern = re.escape(words[i - 1]) + r"\s+" + pattern
        if not re.search(rf"\b{pattern}\b", label):
            return False
    return True


def geocode_one(seed: dict, refresh: bool) -> dict:
    """Return lat/lon + geocode_* fields for one seed row (lat/lon empty if not found).

    Preference order: Nominatim hit whose label carries the name > Overpass
    name match > Nominatim hit with a different name (flagged name_mismatch).
    """
    doubtful = None  # first Nominatim hit whose label does not carry the name

    # 1) Nominatim, trying each search string in order.
    for query in filter(None, (q.strip() for q in seed["queries"].split("|"))):
        for hit in nominatim_search(query, refresh):
            label = hit.get("display_name", "")
            if "gurugram" not in label.lower() and "gurgaon" not in label.lower():
                continue  # e.g. a Delhi place with the same name
            lat, lon = float(hit["lat"]), float(hit["lon"])
            if not in_bbox(lat, lon):
                continue
            result = {
                "lat": f"{lat:.6f}", "lon": f"{lon:.6f}",
                "geocode_status": "found",
                "geocode_source": "nominatim",
                "geocode_label": f"{label} [{hit.get('category')}/{hit.get('type')}]",
            }
            if name_matches(query, label):
                return result
            if doubtful is None:
                doubtful = {**result, "geocode_status": "name_mismatch"}

    # 2) Overpass name search. Prefer point features (nodes) over roads/areas.
    if seed.get("overpass_name"):
        try:
            elements = overpass_search(seed["overpass_name"], refresh)
        except requests.RequestException as err:
            print(f"   Overpass failed for {seed['name']}: {err}")
            elements = []
        elements.sort(key=lambda e: e["type"] != "node")
        for el in elements:
            point = el.get("center", el)
            if "lat" in point and in_bbox(point["lat"], point["lon"]):
                tags = el.get("tags", {})
                kind = next((tags[k] for k in ("highway", "place", "junction", "amenity") if k in tags), "")
                return {
                    "lat": f"{point['lat']:.6f}", "lon": f"{point['lon']:.6f}",
                    "geocode_status": "found",
                    "geocode_source": "overpass",
                    "geocode_label": f"{tags.get('name', '?')} [OSM {el['type']} {el['id']} {kind}]",
                }

    # 3) A hit with a different name is better than nothing, but it is flagged.
    if doubtful:
        return doubtful

    # 4) Nothing found: leave empty for the team to pin by hand.
    return {"lat": "", "lon": "", "geocode_status": "not_found", "geocode_source": "", "geocode_label": ""}


def load_existing() -> dict:
    """Existing hotspots.csv rows keyed by id (empty dict on first run)."""
    if not HOTSPOTS_CSV.exists():
        return {}
    with HOTSPOTS_CSV.open(newline="") as f:
        return {row["id"]: row for row in csv.DictReader(f)}


def is_locked(row: dict) -> bool:
    """A row a person has checked or pinned must not be overwritten."""
    return row.get("verified", "").lower() == "yes" or row.get("geocode_source") == "manual"


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--refresh", action="store_true", help="ignore cached geocoder responses")
    args = parser.parse_args()

    existing = load_existing()
    with HOTSPOTS_SEED_CSV.open(newline="") as f:
        seeds = list(csv.DictReader(f))

    out_rows = []
    for seed in seeds:
        old = existing.pop(seed["id"], None)
        if old and is_locked(old):
            print(f"{seed['id']} {seed['name']:<48} kept (checked by team)")
            out_rows.append(old)
            continue

        result = geocode_one(seed, args.refresh)
        row = {col: "" for col in HOTSPOT_COLUMNS}
        row.update({"id": seed["id"], "name": seed["name"], "location_kind": seed["location_kind"],
                    "notes": seed["notes"]})
        if old:  # keep fields the team may have filled in (zone, grade, notes, verified=no)
            for col in ("zone", "mcg_severity_grade", "verified", "notes"):
                row[col] = old.get(col) or row[col]
        row.update(result)
        out_rows.append(row)
        print(f"{seed['id']} {seed['name']:<48} {row['geocode_status']:<14} {row['geocode_label'][:70]}")

    # Rows not in the seed file (e.g. MCG's full list) are kept untouched.
    out_rows.extend(existing.values())

    with HOTSPOTS_CSV.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=HOTSPOT_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(out_rows)

    report(out_rows)


def report(rows: list):
    """Print what needs a human, and check the study box against the hotspots."""
    located = [r for r in rows if r["lat"]]
    print(f"\nWrote {len(rows)} hotspots to {HOTSPOTS_CSV} ({len(located)} located).")

    todo = [r for r in rows if r["geocode_status"] in ("not_found", "name_mismatch")]
    if todo:
        print("Needs a manual pin or check:")
        for r in todo:
            print(f"  {r['id']} {r['name']} ({r['geocode_status']})")
    print("Every row stays unverified until a team member checks the pin and sets verified=yes.")

    if located:
        lats = [float(r["lat"]) for r in located]
        lons = [float(r["lon"]) for r in located]
        south, west, north, east = BBOX
        print(f"Hotspot extent: lat {min(lats):.3f}-{max(lats):.3f}, lon {min(lons):.3f}-{max(lons):.3f}")
        print(f"Study box:      lat {south}-{north}, lon {west}-{east}")
        margin = 0.01  # ~1 km
        near_edge = [r["id"] for r in located
                     if min(float(r["lat"]) - south, north - float(r["lat"]),
                            float(r["lon"]) - west, east - float(r["lon"])) < margin]
        if near_edge:
            print(f"WARNING: within ~1 km of the box edge, consider widening BBOX: {near_edge}")


if __name__ == "__main__":
    main()
