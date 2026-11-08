"""Download drains, streams and canals from OpenStreetMap (Overpass API).

Run from the repo root:
    python -m pipeline.fetch_osm

Writes data/osm/waterways.geojson (raw, gitignored). build_network.py burns
the drains into the DEM and writes a simplified copy for the map.
"""
import json

import requests

from pipeline.config import DEM_BBOX, OSM_DIR, USER_AGENT, WATERWAYS_GEOJSON

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
KINDS = "drain|canal|river|stream|ditch"


def main():
    south, west, north, east = DEM_BBOX
    query = (f'[out:json][timeout:120];'
             f'way["waterway"~"^({KINDS})$"]({south},{west},{north},{east});'
             f'out geom tags;')
    print("Querying Overpass ...", flush=True)
    r = requests.post(OVERPASS_URL, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=180)
    r.raise_for_status()

    features = []
    for way in r.json()["elements"]:
        tags = way.get("tags", {})
        coords = [[p["lon"], p["lat"]] for p in way.get("geometry", [])]
        if len(coords) < 2:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "osm_id": way["id"],
                "waterway": tags.get("waterway"),
                "name": tags.get("name", ""),
                "covered": bool(tags.get("tunnel") or tags.get("covered") == "yes"),
            },
        })

    OSM_DIR.mkdir(parents=True, exist_ok=True)
    WATERWAYS_GEOJSON.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    kinds = {}
    for f in features:
        kinds[f["properties"]["waterway"]] = kinds.get(f["properties"]["waterway"], 0) + 1
    print(f"Wrote {len(features)} waterways to {WATERWAYS_GEOJSON}: {kinds}")


if __name__ == "__main__":
    main()
