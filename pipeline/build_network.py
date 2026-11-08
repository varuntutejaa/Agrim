"""Build the hotspot drainage network from the DEM.

Run from the repo root (after fetch_dem, fetch_landcover, fetch_osm):
    python -m pipeline.build_network

Steps
1. Burn OSM drains/streams into the DEM (lower it by BURN_DEPTH_M along
   them) so water follows the drains that exist, not roof-top noise.
   Irrigation canals are NOT burned: they run on embankments and don't
   collect street runoff.
2. Condition the DEM (fill pits and depressions, resolve flats) and compute
   D8 flow direction and flow accumulation with pysheds.
3. Snap each hotspot to the nearest flow line (or burned OSM drain) within
   SNAP_RADIUS_M. If there is none, the hotspot stays where it is and gets a
   small local catchment, which is reported as is.
4. Delineate each hotspot's upstream catchment.
5. Graph: edge A -> B when the flow path from A passes within LINK_RADIUS_M
   of B (water from A reaches B). Keep only direct links (transitive
   reduction). Exact-cell matching misses most links on a 30 m grid,
   because a drain often passes 50-100 m beside a junction.
6. Rank "critical intervention nodes" by how many hotspots lie downstream.
7. Terrain features per hotspot for the risk model (milestone 3):
   elevation, HAND (height above nearest drainage, idea from JalNetra's
   corridor.py), local relief, built-up share, catchment size.
8. Which rain-forecast grid points to use for each hotspot: the nearest one
   ("on the spot") and those inside its upstream area (own catchment plus
   the catchments of upstream hotspots).

Outputs
  data/dem/{dem_burned,fdir,acc,hand}.tif   rasters (gitignored)
  data/network/network.json                 nodes + edges + meta (API /network)
  data/network/catchments.geojson           catchment polygons
  data/network/streams.geojson              DEM-derived flow lines (map context)
  data/network/drains.geojson               simplified OSM waterways (map context)
  data/network/hotspot_terrain.csv          static features for the risk model
"""
import csv
import json
from datetime import datetime
from zoneinfo import ZoneInfo

import networkx as nx
import numpy as np
import rasterio
from rasterio.features import rasterize, shapes
from scipy.ndimage import uniform_filter
from shapely.geometry import LineString, mapping, shape
import shapely
from shapely.ops import unary_union
from pyproj import Transformer

from pipeline import raster_grid as g
from pipeline.fetch_rain_forecast import build_grid
from pipeline.config import (
    BUILTUP_TIF, DEM_BBOX, DEM_DIR, DEM_TIF, HOTSPOTS_CSV, NETWORK_DIR, TIMEZONE, WATERWAYS_GEOJSON,
)

# --- Parameters (documented in docs/NETWORK.md) -------------------------------
BURN_DEPTH_M = 5.0        # how far drains are carved into the DEM
BURN_KINDS = {"drain", "stream", "river", "ditch"}   # not "canal"
SNAP_RADIUS_M = 150       # snap a hotspot to the nearest flow line / drain within this distance
SNAP_CHANNEL_KM2 = 0.1    # a "flow line" for snapping drains at least this much area
LINK_RADIUS_M = 150       # A -> B if A's flow path passes within this distance of B
CHANNEL_KM2 = 0.5         # cells draining >= this count as "drainage" for HAND
STREAM_KM2 = 1.0          # flow lines drawn on the map
RELIEF_WINDOW_M = 1000    # local relief = elevation - mean of a 1 km window
BUILTUP_WINDOW_M = 500    # built-up share in a 500 m window around the hotspot

# D8 direction codes (pysheds default): N, NE, E, SE, S, SW, W, NW
DIRMAP = (64, 128, 1, 2, 4, 8, 16, 32)
STEP = {64: (-1, 0), 128: (-1, 1), 1: (0, 1), 2: (1, 1), 4: (1, 0), 8: (1, -1), 16: (0, -1), 32: (-1, -1)}

_utm_to_lonlat = Transformer.from_crs(g.CRS, "EPSG:4326", always_xy=True).transform
_lonlat_to_utm = Transformer.from_crs("EPSG:4326", g.CRS, always_xy=True).transform


def shp_transform(func, geom):
    """Reproject a shapely geometry with a pyproj transform function."""
    return shapely.transform(geom, lambda xy: np.column_stack(func(xy[:, 0], xy[:, 1])))


# --- Helpers ------------------------------------------------------------------

def load_hotspots() -> list[dict]:
    with HOTSPOTS_CSV.open(newline="") as f:
        rows = list(csv.DictReader(f))
    skipped = [r["id"] for r in rows if not r["lat"]]
    if skipped:
        print(f"Skipping hotspots without coordinates: {skipped}")
    return [r for r in rows if r["lat"]]


def write_tif(path, array, dtype="float32", nodata=None):
    with rasterio.open(path, "w", **g.profile(dtype, nodata)) as dst:
        dst.write(array.astype(dtype), 1)


def burn_drains(dem: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Lower the DEM along OSM drains. Returns (burned DEM, drain mask)."""
    fc = json.loads(WATERWAYS_GEOJSON.read_text())
    lines = [shp_transform(_lonlat_to_utm, shape(f["geometry"]))
             for f in fc["features"] if f["properties"]["waterway"] in BURN_KINDS]
    mask = rasterize(((ln, 1) for ln in lines), out_shape=dem.shape, transform=g.TRANSFORM,
                     all_touched=True, dtype="uint8").astype(bool)
    return np.where(mask, dem - BURN_DEPTH_M, dem), mask


def route(burned_path):
    """Condition the DEM and return (pysheds grid, fdir raster, acc raster)."""
    from pysheds.grid import Grid  # imported here: slow import, only needed in this step

    grid = Grid.from_raster(str(burned_path))
    dem = grid.read_raster(str(burned_path))
    # float64 so the tiny slopes added to flat areas are not lost to rounding.
    dem = as_raster(np.asarray(dem, dtype=np.float64), dem)
    dem = grid.fill_pits(dem)
    # resolve_flats tilts flat areas so water can cross them. On very large
    # flats (e.g. the old Najafgarh lake bed) the tilt can lift a flat above a
    # neighbouring cell and create a new pit, so fill + resolve is repeated
    # until no cell inside the box is left without an outflow.
    for _ in range(5):
        dem = grid.resolve_flats(grid.fill_depressions(dem), eps=1e-7)
        fdir = grid.flowdir(dem, dirmap=DIRMAP)
        inner = np.asarray(fdir)[1:-1, 1:-1]
        undrained = int(((inner == -1) | (inner == -2)).sum())
        if undrained == 0:
            break
    else:
        raise RuntimeError(f"{undrained} cells still have no outflow after conditioning")
    acc = grid.accumulation(fdir, dirmap=DIRMAP)
    return grid, fdir, acc


def as_raster(array: np.ndarray, like):
    """Wrap a numpy array as a pysheds Raster on the same grid as `like`."""
    from pysheds.sview import Raster
    return Raster(array, viewfinder=like.viewfinder)


def snap(row: int, col: int, channel: np.ndarray) -> tuple[int, int, bool]:
    """Nearest channel cell within SNAP_RADIUS_M of (row, col).

    Returns (row, col, snapped?). Nearest, not highest-flow: picking the
    highest flow in a window always drags the point downstream to the
    window's edge.
    """
    r = SNAP_RADIUS_M // 30
    r0, c0 = max(row - r, 0), max(col - r, 0)
    rr, cc = np.nonzero(channel[r0:row + r + 1, c0:col + r + 1])
    if rr.size == 0:
        return row, col, False
    d = np.hypot(rr + r0 - row, cc + c0 - col)
    i = int(np.argmin(d))
    if d[i] * 30 > SNAP_RADIUS_M:
        return row, col, False
    return int(rr[i] + r0), int(cc[i] + c0), True


def trace(fdir: np.ndarray, row: int, col: int, stop: set, max_steps=20000):
    """Follow flow downstream from (row, col) until a cell in `stop`, the grid edge, or a sink.

    Returns (path as list of (row, col), how it ended: 'hit' / 'edge' / 'sink').
    """
    path = [(row, col)]
    for _ in range(max_steps):
        d = int(fdir[row, col])
        if d not in STEP:
            on_border = row in (0, g.HEIGHT - 1) or col in (0, g.WIDTH - 1)
            return path, "edge" if on_border else "sink"
        dr, dc = STEP[d]
        row, col = row + dr, col + dc
        if not (0 <= row < g.HEIGHT and 0 <= col < g.WIDTH):
            return path, "edge"
        path.append((row, col))
        if (row, col) in stop:
            return path, "hit"
    return path, "sink"


def path_to_lonlat(path, simplify_m=15) -> list:
    xs, ys = zip(*(g.TRANSFORM * (c + 0.5, r + 0.5) for r, c in path))
    line = LineString(zip(xs, ys)) if len(path) > 1 else LineString([(xs[0], ys[0]), (xs[0], ys[0])])
    line = shp_transform(_utm_to_lonlat, line.simplify(simplify_m))
    return [[round(x, 5), round(y, 5)] for x, y in line.coords]


def mask_to_polygon(mask: np.ndarray):
    """Boolean mask -> simplified shapely polygon in lon/lat."""
    polys = [shape(geom) for geom, val in shapes(mask.astype("uint8"), mask=mask, transform=g.TRANSFORM) if val]
    poly = unary_union(polys).simplify(30)
    return shp_transform(_utm_to_lonlat, poly)


def round_geom(geom, nd=5):
    """GeoJSON geometry with coordinates rounded (smaller files)."""
    def rnd(c):
        return [rnd(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], nd), round(c[1], nd)]
    gj = json.loads(json.dumps(mapping(geom)))
    gj["coordinates"] = rnd(gj["coordinates"])
    return gj


def rain_points_per_hotspot(nodes: dict) -> dict:
    """For each hotspot: (nearest rain grid point, grid points inside its upstream area).

    Upstream area = own catchment + catchments of all upstream hotspots. If no
    grid point falls inside (small catchments), the nearest one is used.
    """
    grid_pts = build_grid()
    cells = [(p["point_id"], *g.lonlat_to_rowcol(p["lon"], p["lat"])) for p in grid_pts]
    out = {}
    for hid, n in nodes.items():
        area = n["catch"].copy()
        for up in n["upstream"]:
            area |= nodes[up]["catch"]
        inside = [pid for pid, r, c in cells if 0 <= r < g.HEIGHT and 0 <= c < g.WIDTH and area[r, c]]
        nearest = min(cells, key=lambda t: (t[1] - n["row"]) ** 2 + (t[2] - n["col"]) ** 2)[0]
        out[hid] = (nearest, inside or [nearest])
    return out


def exit_side(row: int, col: int) -> str:
    if row <= 0:
        return "north"
    if row >= g.HEIGHT - 1:
        return "south"
    return "west" if col <= 0 else "east"


# --- Main ---------------------------------------------------------------------

def main():
    NETWORK_DIR.mkdir(parents=True, exist_ok=True)
    hotspots = load_hotspots()

    with rasterio.open(DEM_TIF) as src:
        dem = src.read(1)
    with rasterio.open(BUILTUP_TIF) as src:
        builtup = src.read(1)

    # 1-2. Burn drains, condition, route.
    burned, drain_mask = burn_drains(dem)
    burned_path = DEM_DIR / "dem_burned.tif"
    write_tif(burned_path, burned, nodata=np.nan)
    print(f"Burned {drain_mask.sum():,} drain cells into the DEM. Routing flow (takes a minute) ...", flush=True)
    grid, fdir_r, acc_r = route(burned_path)
    fdir = np.asarray(fdir_r)
    acc = np.asarray(acc_r)             # number of cells draining through each cell (incl. itself)
    acc_km2 = acc * g.CELL_AREA_KM2
    write_tif(DEM_DIR / "fdir.tif", fdir, "int16")
    write_tif(DEM_DIR / "acc.tif", acc_km2)

    # HAND on the original DEM, with "drainage" = big flow lines + burned drains.
    channels = (acc_km2 >= CHANNEL_KM2) | drain_mask
    hand = np.asarray(grid.compute_hand(fdir_r, grid.read_raster(str(DEM_TIF)), as_raster(channels, fdir_r),
                                        dirmap=DIRMAP))
    write_tif(DEM_DIR / "hand.tif", hand, nodata=np.nan)

    snap_channels = (acc_km2 >= SNAP_CHANNEL_KM2) | drain_mask

    relief = dem - uniform_filter(dem, size=RELIEF_WINDOW_M // 30 + 1, mode="nearest")
    builtup_local = uniform_filter(builtup, size=BUILTUP_WINDOW_M // 30 + 1, mode="nearest")

    # 3-4. Snap hotspots and delineate catchments.
    nodes = {}
    for h in hotspots:
        row, col = g.lonlat_to_rowcol(float(h["lon"]), float(h["lat"]))
        srow, scol, on_channel = snap(row, col, snap_channels)
        catch = np.asarray(grid.catchment(x=scol, y=srow, fdir=fdir_r, dirmap=DIRMAP, xytype="index")).astype(bool)
        truncated = bool(catch[0].any() or catch[-1].any() or catch[:, 0].any() or catch[:, -1].any())
        snap_lon, snap_lat = g.rowcol_to_lonlat(srow, scol)
        nodes[h["id"]] = {
            "hotspot": h, "row": srow, "col": scol, "catch": catch,
            "snap_lon": snap_lon, "snap_lat": snap_lat,
            "snap_dist_m": round(30 * float(np.hypot(srow - row, scol - col))),
            "on_flow_line": on_channel,
            "catchment_km2": round(float(catch.sum()) * g.CELL_AREA_KM2, 3),
            "catchment_truncated": truncated,
            "elevation_m": round(float(dem[srow, scol]), 1),
            "hand_m": round(float(hand[srow, scol]), 2),
            "relief_1km_m": round(float(relief[srow, scol]), 2),
            "builtup_share_500m": round(float(builtup_local[srow, scol]), 3),
            "builtup_share_catchment": round(float(builtup[catch].mean()), 3),
            # Largest drained area within SNAP_RADIUS_M: a usable "upstream area"
            # even for hotspots that sit off any flow line.
            "max_drained_km2_150m": round(float(acc_km2[max(row - 5, 0):row + 6, max(col - 5, 0):col + 6].max()), 2),
        }
        n = nodes[h["id"]]
        where = f"snapped {n['snap_dist_m']} m" if on_channel else "no flow line nearby"
        edge_note = " (cut off at box edge)" if truncated else ""
        print(f"  {h['id']} {h['name'][:34]:<34} catchment {n['catchment_km2']:7.2f} km2{edge_note}  {where}")

    # 5. Graph: A -> B if A's flow path passes within LINK_RADIUS_M of B.
    link_cells = LINK_RADIUS_M / 30
    paths = {}
    for a, na in nodes.items():
        path, how = trace(fdir, na["row"], na["col"], set())
        paths[a] = (np.array(path), how)

    G = nx.DiGraph()
    G.add_nodes_from(nodes)
    meet = {}  # (a, b) -> index along a's path closest to b
    for a in nodes:
        pa = paths[a][0]
        for b, nb in nodes.items():
            if a == b:
                continue
            d = np.hypot(pa[:, 0] - nb["row"], pa[:, 1] - nb["col"])
            near = np.flatnonzero(d <= link_cells)
            if near.size and near[0] > 0:   # index 0 is A itself
                G.add_edge(a, b)
                meet[(a, b)] = int(near[0] + np.argmin(d[near[0]:near[0] + int(2 * link_cells) + 1]))
    # Two hotspots within the radius of each other can link both ways; keep the
    # direction toward the cell that drains more area (that one is downstream).
    for a, b in list(G.edges):
        if G.has_edge(b, a):
            acc_a = acc[nodes[a]["row"], nodes[a]["col"]]
            acc_b = acc[nodes[b]["row"], nodes[b]["col"]]
            G.remove_edge(*((a, b) if acc_a > acc_b else (b, a)))
    if not nx.is_directed_acyclic_graph(G):
        raise RuntimeError(f"Network has a cycle: {nx.find_cycle(G)}")
    G = nx.transitive_reduction(G)

    # Edge geometry: A's flow path down to where it passes B; for the last
    # hotspot on a path, the first ~12 km of where the water goes next.
    edge_features, exit_sides = [], {}
    for a in nodes:
        path, how = paths[a]
        targets = list(G.successors(a))
        for b in targets:
            seg = [tuple(p) for p in path[:meet[(a, b)] + 1]] + [(nodes[b]["row"], nodes[b]["col"])]
            edge_features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": path_to_lonlat(seg)},
                "properties": {"from": a, "to": b, "kind": "hotspot", "length_km": round(len(seg) * 0.03, 2)},
            })
        if not targets:
            side = exit_side(*path[-1]) if how == "edge" else "sink"
            exit_sides[a] = side
            edge_features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": path_to_lonlat([tuple(p) for p in path[:400]])},
                "properties": {"from": a, "to": None, "kind": "exit", "exits": side,
                               "length_km": round(len(path) * 0.03, 2)},
            })

    # 6. Critical intervention nodes.
    for hid, n in nodes.items():
        n["downstream"] = sorted(nx.descendants(G, hid))
        n["upstream"] = sorted(nx.ancestors(G, hid))
        n["downstream_direct"] = sorted(G.successors(hid))
    ranked = sorted(nodes, key=lambda k: (-len(nodes[k]["downstream"]), -nodes[k]["catchment_km2"]))
    for i, hid in enumerate(ranked, 1):
        nodes[hid]["critical_rank"] = i

    write_outputs(nodes, edge_features, exit_sides, acc_km2, grid, fdir_r, drain_mask)


def write_outputs(nodes, edge_features, exit_sides, acc_km2, grid, fdir_r, drain_mask):
    names = {hid: n["hotspot"]["name"] for hid, n in nodes.items()}
    feature_cols = ["elevation_m", "hand_m", "relief_1km_m", "builtup_share_500m",
                    "builtup_share_catchment", "catchment_km2", "max_drained_km2_150m", "catchment_truncated",
                    "on_flow_line", "snap_dist_m"]

    node_features, catch_features = [], []
    for hid, n in nodes.items():
        h = n["hotspot"]
        props = {
            "id": hid, "name": h["name"], "verified": h["verified"].lower() == "yes",
            "critical_rank": n["critical_rank"],
            "n_downstream": len(n["downstream"]), "n_upstream": len(n["upstream"]),
            "downstream": n["downstream"], "upstream": n["upstream"],
            "downstream_direct": n["downstream_direct"],
            "exits": exit_sides.get(hid),
            **{c: n[c] for c in feature_cols},
        }
        node_features.append({"type": "Feature",
                              "geometry": {"type": "Point", "coordinates": [round(n["snap_lon"], 6), round(n["snap_lat"], 6)]},
                              "properties": props})
        catch_features.append({"type": "Feature", "geometry": round_geom(mask_to_polygon(n["catch"])),
                               "properties": {"id": hid, "name": h["name"], "catchment_km2": n["catchment_km2"],
                                              "truncated": n["catchment_truncated"]}})
    node_features.sort(key=lambda f: f["properties"]["critical_rank"])

    now = datetime.now(ZoneInfo(TIMEZONE)).isoformat(timespec="seconds")
    sides = list(exit_sides.values())
    meta = {
        "built_at": now,
        "is_synthetic": False,
        "dem": "Copernicus DEM GLO-30 (surface model), UTM 43N 30 m",
        "drains": "OpenStreetMap waterways via Overpass",
        "landcover": "ESA WorldCover 10 m v200 (2021)",
        "dem_bbox_south_west_north_east": DEM_BBOX,
        "params": {"burn_depth_m": BURN_DEPTH_M, "burn_kinds": sorted(BURN_KINDS), "snap_radius_m": SNAP_RADIUS_M, "snap_channel_km2": SNAP_CHANNEL_KM2,
                   "link_radius_m": LINK_RADIUS_M,
                   "channel_km2": CHANNEL_KM2, "stream_km2": STREAM_KM2},
        "n_hotspots": len(nodes),
        "n_edges": sum(1 for f in edge_features if f["properties"]["kind"] == "hotspot"),
        "terminal_exit_sides": {s: sides.count(s) for s in set(sides)},
        "caveat": "Derived from a 30 m surface DEM and OSM drains; not yet checked against MCG drain maps.",
    }
    network = {"meta": meta,
               "nodes": {"type": "FeatureCollection", "features": node_features},
               "edges": {"type": "FeatureCollection", "features": edge_features}}
    (NETWORK_DIR / "network.json").write_text(json.dumps(network))
    (NETWORK_DIR / "catchments.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": catch_features}))

    # Flow lines for map context, width by drained area.
    streams = grid.extract_river_network(fdir_r, as_raster(acc_km2 >= STREAM_KM2, fdir_r), dirmap=DIRMAP)
    stream_features = []
    for f in streams["features"]:
        line = LineString(f["geometry"]["coordinates"])
        if line.length < 60:
            continue
        x, y = line.coords[-1]
        col, row = ~g.TRANSFORM * (x, y)
        r, c = min(int(row), g.HEIGHT - 1), min(int(col), g.WIDTH - 1)
        stream_features.append({"type": "Feature",
                                "geometry": round_geom(shp_transform(_utm_to_lonlat, line.simplify(20))),
                                "properties": {"acc_km2": round(float(acc_km2[r, c]), 1)}})
    (NETWORK_DIR / "streams.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": stream_features}))

    # Simplified OSM waterways for the map.
    fc = json.loads(WATERWAYS_GEOJSON.read_text())
    drains = [{"type": "Feature", "geometry": round_geom(shape(f["geometry"]).simplify(0.0001)),
               "properties": {k: f["properties"][k] for k in ("waterway", "name", "covered")}}
              for f in fc["features"]]
    (NETWORK_DIR / "drains.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": drains}))

    # 8. Rain grid points per hotspot.
    rain_points = rain_points_per_hotspot(nodes)

    # Static terrain features for the risk model.
    with (NETWORK_DIR / "hotspot_terrain.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "name", "critical_rank", "n_downstream", "n_upstream", *feature_cols,
                    "upstream_ids", "spot_grid_point", "upstream_grid_points"])
        for feat in node_features:
            p = feat["properties"]
            spot, upstream = rain_points[p["id"]]
            w.writerow([p["id"], p["name"], p["critical_rank"], p["n_downstream"], p["n_upstream"],
                        *[p[c] for c in feature_cols], " ".join(p["upstream"]), spot, " ".join(upstream)])

    # Summary.
    print(f"\nNetwork: {meta['n_hotspots']} hotspots, {meta['n_edges']} direct links. "
          f"Last hotspot on each path drains to: {meta['terminal_exit_sides']}")
    print("Critical intervention nodes (most hotspots downstream):")
    for feat in node_features[:8]:
        p = feat["properties"]
        down = ", ".join(names[d] for d in p["downstream"]) or "-"
        print(f"  #{p['critical_rank']} {p['name'][:34]:<34} {p['n_downstream']} downstream: {down[:80]}")
    sizes = {k: (NETWORK_DIR / k).stat().st_size // 1024 for k in
             ("network.json", "catchments.geojson", "streams.geojson", "drains.geojson")}
    print(f"File sizes (KB): {sizes}")


if __name__ == "__main__":
    main()
