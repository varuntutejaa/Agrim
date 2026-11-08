# Drainage network (milestone 2)

How Agrim works out which hotspots feed water into which, and where to
intervene first. Code: `pipeline/build_network.py`.

## Inputs

| Layer | Source | Script |
|-------|--------|--------|
| Ground height, 30 m | Copernicus DEM GLO-30 (public AWS bucket, no key) | `pipeline/fetch_dem.py` |
| Drains, streams, canals | OpenStreetMap via Overpass (919 ways: 766 drains, 379 of them covered) | `pipeline/fetch_osm.py` |
| Built-up share | ESA WorldCover 10 m, 2021 (class 50) | `pipeline/fetch_landcover.py` |
| Hotspots | `data/hotspots.csv` (19 of 21 have coordinates) | `pipeline/geocode_hotspots.py` |

Terrain box: lat 28.28–28.62, lon 76.85–77.30. That's larger than the city
so the Aravalli ridge (south/south-east) and the route to the Najafgarh drain
(north) are both inside it. Everything is computed on one UTM 43N 30 m grid
(`pipeline/raster_grid.py`).

## Method

1. **Burn drains.** OSM drains, streams, rivers and ditches are cut 5 m into
   the DEM so water follows them. Irrigation canals are left out: they run
   raised on embankments and don't collect street runoff.
2. **Condition and route.** Fill pits and depressions, tilt flat areas so
   water can cross them, then compute D8 flow direction and accumulation
   (pysheds). Fill + tilt is repeated until no cell inside the box is left
   without an outflow. One pass wasn't enough: on very large flats like the
   old Najafgarh lake bed, the tilt created new pits.
3. **Snap hotspots.** Each hotspot moves to the nearest flow line (≥ 0.1 km²
   drained) or OSM drain within 150 m. If there is none, it stays where it is.
4. **Catchments.** Everything upstream of the snapped cell.
5. **Links.** A → B when the flow path from A passes within 150 m of B.
   Only direct links are kept (if A → B → C, the A → C link is dropped).
   Exact-cell matching found almost no links, because on a 30 m grid a drain
   often passes 50–100 m beside a junction.
6. **Critical intervention points.** Ranked by the number of hotspots
   downstream; ties are broken by drained area.

## Features written for the risk model (`data/network/hotspot_terrain.csv`)

| Column | Meaning |
|--------|---------|
| `elevation_m` | Ground height (surface model) at the snapped cell |
| `hand_m` | Height above the nearest drainage line: low = floods first (idea from JalNetra) |
| `relief_1km_m` | Height minus the average height of the surrounding 1 km. Negative = a dip |
| `builtup_share_500m` | Share of built-up land within ~500 m |
| `builtup_share_catchment` | Share of built-up land in the upstream catchment |
| `catchment_km2` | Area draining to the snapped cell |
| `max_drained_km2_150m` | Largest drained area within 150 m. Usable even when a hotspot is off any flow line |
| `catchment_truncated` | Catchment reaches the edge of the terrain box (area is a lower bound) |
| `on_flow_line`, `snap_dist_m` | Whether and how far the hotspot was moved onto a flow line |

## Results (8 Nov 2026 build)

- Every path leaves the city to the **north**, toward the Najafgarh drain
  (11 of 11 end paths), which matches the known drainage direction.
- **Hero Honda Chowk** receives water from 5 mapped hotspots (Sushant Lok,
  Rajiv Chowk, Islampur, Sector 39, Civil Lines) and sits 2.4 m below its
  surroundings. It's the main collecting point in this network.
- Golf Course Extension Road drains the largest area (~139 km², reaching
  back to the Aravalli ridge).
- 8 hotspots have no flow line within 150 m. Their flooding is local runoff
  in a dip, not water arriving down a drain.

## Limits (say these out loud in the pitch)

- **Surface model, not bare ground.** Copernicus GLO-30 includes roofs and
  trees. In dense areas, flow directions are less reliable; burning OSM
  drains helps only where drains are mapped.
- **OSM drains are incomplete** and mostly unnamed. MCG's stormwater drain
  map (e.g. the Badshahpur drain and Leg 1/2/3 alignments) would improve
  this a lot. If we get it, burn it in the same way.
- **Shallow graph.** With only 19 mapped hotspots, the deepest chain is one
  link, so most ranks are ties. MCG's full list of 159 hotspots will give a
  deeper, more useful ranking.
- **Not validated** against observed flooding yet. The incident log
  (`data/incidents.csv`) is how we'll check it.

## Re-running

```bash
python -m pipeline.fetch_dem
python -m pipeline.fetch_landcover
python -m pipeline.fetch_osm
python -m pipeline.build_network
```

Re-run `build_network` whenever `data/hotspots.csv` changes (new pins,
verified locations, MCG's list).
