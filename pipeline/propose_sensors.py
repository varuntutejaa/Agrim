"""Proposed sensor sites (illustrative): where new sensors would do the most good.

Run from the repo root (after build_network and critical_nodes):
    python -m pipeline.propose_sensors

These are PROPOSALS, not installed sensors. The counts follow the project's
proposal (25 rain gauges, 43 drain-level sensors, 8 underpass monitors); the
sites are placed by simple, documented rules:

  rain gauges     k-means centres over the hotspots and the grid points of the
                  areas that drain into them (hotspots weighted x3), so every
                  hotspot's catchment has a gauge nearby. Fixes the biggest
                  weakness: model rain under-reads cloudbursts.
  drain sensors   at each hotspot outfall, then midway along each flow path
                  between hotspots, then on the onward flow below the last
                  hotspot (1 km, then 2.5 km), until the count is reached.
  underpass       mapped underpasses (OpenStreetMap: tunnel=yes or "underpass" in
  monitors        the name) nearest to hotspots, one per underpass, at least 500 m apart.

Output goes to data/synthetic/ with is_synthetic = true, and the app labels
it "Proposed (illustrative)".
"""
import json
import math

import numpy as np
import requests

from pipeline.config import BBOX, DATA_DIR, NETWORK_DIR, USER_AGENT
from pipeline.fetch_rain_forecast import build_grid

N_GAUGES, N_DRAIN, N_UNDERPASS = 25, 43, 8
OUT = DATA_DIR / "synthetic" / "proposed_sensors.geojson"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def km(a, b):
    kx = 111.32 * math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 110.57)


def point(coords, kind, label, why):
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(coords[0], 5), round(coords[1], 5)]},
            "properties": {"kind": kind, "label": label, "why": why, "status": "proposed", "is_synthetic": True}}


def rain_gauges(nodes, terrain_rows):
    from sklearn.cluster import KMeans
    grid = {p["point_id"]: (p["lon"], p["lat"]) for p in build_grid()}
    pts, weights = [], []
    for f in nodes:
        pts.append(f["geometry"]["coordinates"])
        weights.append(3.0)
    for r in terrain_rows:
        for pid in r["upstream_grid_points"].split():
            pts.append(grid[pid])
            weights.append(1.0)
    X = np.array(pts)
    km_ = KMeans(n_clusters=N_GAUGES, n_init=10, random_state=0).fit(X, sample_weight=np.array(weights))
    names = [(f["properties"]["name"], f["geometry"]["coordinates"]) for f in nodes]
    out = []
    for i, c in enumerate(km_.cluster_centers_, 1):
        near = min(names, key=lambda n: km(c, n[1]))
        out.append(point(c, "rain_gauge", f"Rain gauge R{i:02d} · near {near[0]}",
                         "Measures the short, local bursts the weather models miss"))
    return out


def drain_sensors(nodes, edges, critical):
    out = []
    for f in critical["features"]:
        p = f["properties"]
        out.append(point(f["geometry"]["coordinates"], "drain_sensor", f"Drain sensor · {p['label']}",
                         f"Water level where {p['n_hotspots']} hotspot(s) drain"))
    for e in edges:
        if e["properties"]["kind"] == "hotspot" and len(out) < N_DRAIN:
            line = e["geometry"]["coordinates"]
            out.append(point(line[len(line) // 2], "drain_sensor", "Drain sensor · between hotspots",
                             "Shows water travelling from one hotspot towards the next"))
    exits = [e for e in edges if e["properties"]["kind"] == "exit"]
    for frac in (0.25, 0.6):       # roughly 1 km and 2.5 km along the drawn onward path
        for e in exits:
            if len(out) >= N_DRAIN:
                break
            line = e["geometry"]["coordinates"]
            out.append(point(line[min(len(line) - 1, int(len(line) * frac))], "drain_sensor",
                             "Drain sensor · onward flow", "Early sign of water backing up below the hotspots"))
    return out[:N_DRAIN]


def underpass_monitors(nodes):
    south, west, north, east = BBOX
    q = (f'[out:json][timeout:90];'
         f'way["highway"]["tunnel"="yes"]({south},{west},{north},{east});'
         f'way["highway"]["name"~"underpass",i]({south},{west},{north},{east});'
         f'out center tags;')
    r = requests.post(OVERPASS_URL, data={"data": q}, headers={"User-Agent": USER_AGENT}, timeout=120)
    r.raise_for_status()
    hs = [(f["properties"]["name"], f["geometry"]["coordinates"]) for f in nodes]
    cands = []
    for el in r.json()["elements"]:
        c = (el["center"]["lon"], el["center"]["lat"])
        name, hc = min(hs, key=lambda h: km(c, h[1]))
        cands.append((km(c, hc), c, el.get("tags", {}).get("name", ""), name))
    cands.sort(key=lambda x: x[0])
    out, used_names = [], set()
    for dist, c, uname, hname in cands:
        if len(out) >= N_UNDERPASS:
            break
        # One monitor per underpass: OSM splits one underpass into several road pieces.
        if (uname and uname.lower() in used_names) or any(km(c, o["geometry"]["coordinates"]) < 0.5 for o in out):
            continue
        if uname:
            used_names.add(uname.lower())
        label = uname or "Underpass"
        out.append(point(c, "underpass_monitor", f"Underpass monitor · {label}",
                         f"{dist:.1f} km from {hname}; underpasses fill first and trap vehicles"))
    return out


def main():
    net = json.loads((NETWORK_DIR / "network.json").read_text())
    critical = json.loads((NETWORK_DIR / "critical_nodes.geojson").read_text())
    import csv
    with (NETWORK_DIR / "hotspot_terrain.csv").open(newline="") as f:
        terrain_rows = list(csv.DictReader(f))
    nodes = net["nodes"]["features"]
    features = rain_gauges(nodes, terrain_rows) + drain_sensors(nodes, net["edges"]["features"], critical) \
        + underpass_monitors(nodes)
    counts = {k: sum(f["properties"]["kind"] == k for f in features) for k in ("rain_gauge", "drain_sensor", "underpass_monitor")}
    OUT.write_text(json.dumps({
        "type": "FeatureCollection", "features": features,
        "meta": {"is_synthetic": True, "label": "Proposed sensor sites (illustrative)", "counts": counts,
                 "method": "pipeline/propose_sensors.py"},
    }))
    print(f"Wrote {OUT}: {counts}")
    for f in features:
        if f["properties"]["kind"] == "underpass_monitor":
            print("  ", f["properties"]["label"], "|", f["properties"]["why"])


if __name__ == "__main__":
    main()
