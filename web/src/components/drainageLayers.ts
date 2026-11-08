// Map layers for the drainage view: OSM drains, DEM flow lines, catchments
// and the hotspot-to-hotspot flow paths. Kept apart from HotspotMap so that
// file stays readable.
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { DrainageLayers } from "../types";

// Order matters: later layers draw on top. All sit below the hotspot circles.
export const DRAINAGE_LAYER_IDS = [
  "catchments-fill",
  "catchments-line",
  "catchment-selected-fill",
  "catchment-selected-line",
  "streams",
  "drains",
  "edges-exit",
  "edges",
  "edges-highlight",
  "edges-arrows",
];

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

// Small arrowhead drawn on a canvas, so we don't need an icon file.
function arrowImage(): ImageData {
  const size = 16;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.canvas.width = ctx.canvas.height = size;
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(3, 3);
  ctx.lineTo(13, 8);
  ctx.lineTo(3, 13);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

/** Add the drainage sources and layers (hidden), just below `beforeId`. */
export function addDrainageLayers(map: maplibregl.Map, beforeId: string) {
  for (const id of ["catchments", "streams", "drains", "edges"]) map.addSource(id, { type: "geojson", data: EMPTY });
  map.addImage("flow-arrow", arrowImage());
  const hidden = { visibility: "none" as const };
  const add = (layer: maplibregl.LayerSpecification) => map.addLayer(layer, beforeId);

  add({ id: "catchments-fill", type: "fill", source: "catchments", layout: hidden,
    paint: { "fill-color": "#94a3b8", "fill-opacity": 0.06 } });
  add({ id: "catchments-line", type: "line", source: "catchments", layout: hidden,
    paint: { "line-color": "#94a3b8", "line-width": 0.8, "line-dasharray": [2, 2] } });
  add({ id: "catchment-selected-fill", type: "fill", source: "catchments", layout: hidden,
    filter: ["==", ["get", "id"], ""], paint: { "fill-color": "#6366f1", "fill-opacity": 0.18 } });
  add({ id: "catchment-selected-line", type: "line", source: "catchments", layout: hidden,
    filter: ["==", ["get", "id"], ""], paint: { "line-color": "#4f46e5", "line-width": 2 } });

  // DEM flow lines: wider where more area drains through.
  add({ id: "streams", type: "line", source: "streams", layout: { ...hidden, "line-cap": "round" },
    paint: {
      "line-color": "#60a5fa",
      "line-opacity": 0.7,
      "line-width": ["interpolate", ["linear"], ["ln", ["max", 1, ["get", "acc_km2"]]], 0, 0.6, 6.5, 4],
    } });
  // OSM drains: covered drains dashed.
  add({ id: "drains", type: "line", source: "drains", layout: hidden,
    paint: {
      "line-color": ["match", ["get", "waterway"], "canal", "#a16207", "#0f766e"],
      "line-width": 1.2,
      "line-dasharray": ["case", ["get", "covered"], ["literal", [2, 1.5]], ["literal", [1, 0]]],
    } });

  add({ id: "edges-exit", type: "line", source: "edges", layout: hidden,
    filter: ["==", ["get", "kind"], "exit"],
    paint: { "line-color": "#64748b", "line-width": 1.5, "line-dasharray": [3, 2], "line-opacity": 0.7 } });
  add({ id: "edges", type: "line", source: "edges", layout: { ...hidden, "line-cap": "round" },
    filter: ["==", ["get", "kind"], "hotspot"],
    paint: { "line-color": "#334155", "line-width": 2.5 } });
  add({ id: "edges-highlight", type: "line", source: "edges", layout: { ...hidden, "line-cap": "round" },
    filter: ["==", ["get", "from"], ""], paint: { "line-color": "#4f46e5", "line-width": 4 } });
  add({ id: "edges-arrows", type: "symbol", source: "edges", layout: {
    ...hidden,
    "symbol-placement": "line",
    "symbol-spacing": 60,
    "icon-image": "flow-arrow",
    "icon-size": 0.8,
    "icon-allow-overlap": true,
    "icon-rotation-alignment": "map",
  } });
}

export function setDrainageData(map: maplibregl.Map, d: DrainageLayers) {
  (map.getSource("catchments") as GeoJSONSource).setData(d.catchments);
  (map.getSource("streams") as GeoJSONSource).setData(d.streams);
  (map.getSource("drains") as GeoJSONSource).setData(d.drains);
  (map.getSource("edges") as GeoJSONSource).setData(d.network.edges);
}

export function setDrainageVisible(map: maplibregl.Map, visible: boolean) {
  for (const id of DRAINAGE_LAYER_IDS) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

/** Highlight the selected hotspot's catchment and the flow paths into and out of it. */
export function highlightDrainage(map: maplibregl.Map, id: string | null) {
  const sel = id ?? "";
  map.setFilter("catchment-selected-fill", ["==", ["get", "id"], sel]);
  map.setFilter("catchment-selected-line", ["==", ["get", "id"], sel]);
  map.setFilter("edges-highlight", ["any", ["==", ["get", "from"], sel], ["==", ["get", "to"], sel]]);
}
