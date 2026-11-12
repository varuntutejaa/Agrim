"""Critical intervention points on the drainage network.

Run from the repo root (after build_network):
    python -m pipeline.critical_nodes

Question (from the brief): which small part of the drain network matters for
most of the flooding, and where should money go first?

Method (uses the same hotspot links as the Drainage view, built in
build_network.py: A -> B when A's water passes within 150 m of B)
1. Each hotspot's outfall serves that hotspot plus every hotspot whose
   water passes through it upstream. Hero Honda Chowk's outfall carries
   water from 5 other hotspots, so clearing or enlarging it relieves 6.
2. Rank outfalls by how many hotspots they serve; ties by drained area.
3. Greedy cover: add the outfall that serves the most not-yet-served
   hotspots, until 80% are served. The cumulative curve shows how
   concentrated the problem is ("x% of points serve y% of hotspots").

Hotspots count equally (there are no reviewed flood counts yet). Cost per
point isn't public, so a "per rupee" ranking needs MCG/GMDA cost estimates
(docs/DATA_REQUIREMENTS.md, D4).

Writes data/network/critical_nodes.geojson (committed; served by the API and
used by the simulator's "block a drain").
"""
import json
import math

from pipeline.config import NETWORK_DIR

COVER_TARGET = 0.8
OUT = NETWORK_DIR / "critical_nodes.geojson"


def build(nodes: list[dict]) -> dict:
    """GeoJSON of ranked outfalls, with the priority set and coverage curve."""
    names = {f["properties"]["id"]: f["properties"]["name"] for f in nodes}
    points = []
    for f in nodes:
        p = f["properties"]
        served = sorted({p["id"], *p["upstream"]})
        points.append({"id": p["id"], "coords": f["geometry"]["coordinates"], "served": served,
                       "drained_km2": p["max_drained_km2_150m"]})
    points.sort(key=lambda x: (-len(x["served"]), -x["drained_km2"]))

    # Greedy cover, recording the cumulative curve all the way to 100%.
    all_h = set(names)
    covered, order, curve = set(), [], []
    remaining = list(points)
    while remaining and covered != all_h:
        pick = max(remaining, key=lambda x: (len(set(x["served"]) - covered), x["drained_km2"]))
        if not set(pick["served"]) - covered:
            break
        remaining.remove(pick)
        covered |= set(pick["served"])
        order.append(pick["id"])
        curve.append({"points": len(order), "hotspots": len(covered)})
    target = math.ceil(COVER_TARGET * len(all_h))
    n_priority = next(c["points"] for c in curve if c["hotspots"] >= target)

    features = []
    for rank, x in enumerate(points, 1):
        others = [names[h] for h in x["served"] if h != x["id"]]
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": x["coords"]},
            "properties": {
                "id": f"N{rank:02d}", "rank": rank, "hotspot_id": x["id"],
                "label": f"{names[x['id']]} outfall",
                "n_hotspots": len(x["served"]), "hotspots": x["served"],
                "upstream_names": others, "drained_km2": x["drained_km2"],
                "priority_order": order.index(x["id"]) + 1 if x["id"] in order[:n_priority] else None,
            },
        })
    return {
        "type": "FeatureCollection",
        "features": features,
        "summary": {
            "n_hotspots": len(all_h), "n_points": len(points), "n_priority": n_priority,
            "priority_share": round(n_priority / len(points), 3),
            "priority_covers": curve[n_priority - 1]["hotspots"],
            "cover_target": COVER_TARGET, "curve": curve,
            "top_label": features[0]["properties"]["label"], "top_serves": features[0]["properties"]["n_hotspots"],
            "weighting": "each mapped hotspot counts equally",
            "cost_note": "A per-rupee ranking needs MCG/GMDA cost estimates (DATA_REQUIREMENTS D4).",
            "is_synthetic": False,
        },
    }


def main():
    nodes = json.loads((NETWORK_DIR / "network.json").read_text())["nodes"]["features"]
    out = build(nodes)
    OUT.write_text(json.dumps(out))
    s = out["summary"]
    print(f"{s['n_points']} outfalls. Top: {s['top_label']} serves {s['top_serves']} hotspots. "
          f"{s['n_priority']} outfalls ({s['priority_share']:.0%}) serve {s['priority_covers']} of "
          f"{s['n_hotspots']} hotspots ({s['priority_covers'] / s['n_hotspots']:.0%}).")
    print("Curve:", ", ".join(f"{c['points']}→{c['hotspots']}" for c in s["curve"]))
    for f in out["features"][:5]:
        p = f["properties"]
        print(f"  {p['id']} serves {p['n_hotspots']}: {p['label']} (+ {', '.join(p['upstream_names']) or 'no others'})")


if __name__ == "__main__":
    main()
