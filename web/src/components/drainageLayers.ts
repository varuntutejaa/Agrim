// Map layers for drainage: OSM drains, DEM flow lines, catchments and the
// hotspot-to-hotspot flow paths. Flow paths take the risk colour of the
// hotspot they start from; at-risk paths get moving dashes so the jury can
// see water (and risk) travelling downstream.
import type maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { DrainageLayers } from "../types";
import { LEVEL_COLOR } from "../risk";
import { MAP } from "../mapColors";

const INK_2 = MAP.ink2;
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Which drainage layers each mode shows. */
const MODES = {
  off: [] as string[],
  // Simulator: just enough to see where water goes.
  edges: ["streams", "edges-exit", "edges", "edges-flow", "edges-arrows"],
  full: [
    "catchments-fill", "catchments-line", "catchment-selected-fill", "catchment-selected-line",
    "streams", "drains", "edges-exit", "edges", "edges-flow", "edges-highlight", "edges-arrows",
  ],
};
export type DrainageMode = keyof typeof MODES;
const ALL = MODES.full;

const levelColor: maplibregl.ExpressionSpecification = [
  "match", ["get", "level"], "red", LEVEL_COLOR.red, "amber", LEVEL_COLOR.amber, INK_2,
];

function arrowImage(): ImageData {
  const size = 16;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.canvas.width = ctx.canvas.height = size;
  ctx.fillStyle = MAP.ink;
  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.lineTo(12, 8);
  ctx.lineTo(4, 12);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

/** Add drainage sources and layers (hidden), just below `beforeId`. */
export function addDrainageLayers(map: maplibregl.Map, beforeId: string) {
  for (const id of ["catchments", "streams", "drains", "edges"]) map.addSource(id, { type: "geojson", data: EMPTY });
  map.addImage("flow-arrow", arrowImage());
  const hidden = { visibility: "none" as const };
  const add = (layer: maplibregl.LayerSpecification) => map.addLayer(layer, beforeId);

  add({ id: "catchments-fill", type: "fill", source: "catchments", layout: hidden,
    paint: { "fill-color": MAP.water, "fill-opacity": 0.04 } });
  add({ id: "catchments-line", type: "line", source: "catchments", layout: hidden,
    paint: { "line-color": MAP.water, "line-opacity": 0.35, "line-width": 0.7, "line-dasharray": [2, 2] } });
  add({ id: "catchment-selected-fill", type: "fill", source: "catchments", layout: hidden,
    filter: ["==", ["get", "id"], ""], paint: { "fill-color": MAP.water, "fill-opacity": 0.14 } });
  add({ id: "catchment-selected-line", type: "line", source: "catchments", layout: hidden,
    filter: ["==", ["get", "id"], ""], paint: { "line-color": MAP.water, "line-width": 1.6 } });

  add({ id: "streams", type: "line", source: "streams", layout: { ...hidden, "line-cap": "round" },
    paint: {
      "line-color": MAP.water,
      "line-opacity": ["interpolate", ["linear"], ["ln", ["max", 1, ["get", "acc_km2"]]], 0, 0.14, 6.5, 0.45],
      "line-width": ["interpolate", ["linear"], ["ln", ["max", 1, ["get", "acc_km2"]]], 0, 0.5, 6.5, 3.2],
    } });
  add({ id: "drains", type: "line", source: "drains", layout: hidden,
    paint: {
      "line-color": ["match", ["get", "waterway"], "canal", MAP.canal, MAP.drain],
      "line-width": 1.1,
      "line-dasharray": ["case", ["get", "covered"], ["literal", [2, 1.5]], ["literal", [1, 0]]],
    } });

  add({ id: "edges-exit", type: "line", source: "edges", layout: hidden,
    filter: ["==", ["get", "kind"], "exit"],
    paint: { "line-color": INK_2, "line-width": 1, "line-dasharray": [3, 2], "line-opacity": 0.4 } });
  add({ id: "edges", type: "line", source: "edges", layout: { ...hidden, "line-cap": "round", "line-join": "round" },
    filter: ["==", ["get", "kind"], "hotspot"],
    paint: { "line-color": levelColor, "line-width": ["match", ["get", "level"], "red", 4, "amber", 3.5, 2.2],
      "line-opacity": ["match", ["get", "level"], "red", 0.35, "amber", 0.35, 0.9] } });
  // Moving dashes on paths that start at a Red/Amber hotspot (animated in HotspotMap).
  add({ id: "edges-flow", type: "line", source: "edges", layout: { ...hidden, "line-cap": "butt", "line-join": "round" },
    filter: ["all", ["==", ["get", "kind"], "hotspot"], ["in", ["get", "level"], ["literal", ["red", "amber"]]]],
    paint: { "line-color": levelColor, "line-width": 4, "line-dasharray": [0, 4, 3] } });
  add({ id: "edges-highlight", type: "line", source: "edges", layout: { ...hidden, "line-cap": "round" },
    filter: ["==", ["get", "from"], ""], paint: { "line-color": MAP.ink, "line-width": 4.5 } });
  add({ id: "edges-arrows", type: "symbol", source: "edges", filter: ["==", ["get", "kind"], "hotspot"], layout: {
    ...hidden,
    "symbol-placement": "line",
    "symbol-spacing": 70,
    "icon-image": "flow-arrow",
    "icon-size": 0.75,
    "icon-allow-overlap": true,
    "icon-rotation-alignment": "map",
  } });
}

export function setDrainageData(map: maplibregl.Map, d: DrainageLayers, edges: GeoJSON.FeatureCollection) {
  (map.getSource("catchments") as GeoJSONSource).setData(d.catchments);
  (map.getSource("streams") as GeoJSONSource).setData(d.streams);
  (map.getSource("drains") as GeoJSONSource).setData(d.drains);
  (map.getSource("edges") as GeoJSONSource).setData(edges);
}

export function setEdges(map: maplibregl.Map, edges: GeoJSON.FeatureCollection) {
  (map.getSource("edges") as GeoJSONSource | undefined)?.setData(edges);
}

export function setDrainageMode(map: maplibregl.Map, mode: DrainageMode) {
  const show = new Set(MODES[mode]);
  for (const id of ALL) map.setLayoutProperty(id, "visibility", show.has(id) ? "visible" : "none");
}

/** Highlight the selected hotspot's catchment and the flow paths into and out of it. */
export function highlightDrainage(map: maplibregl.Map, id: string | null) {
  const sel = id ?? "";
  map.setFilter("catchment-selected-fill", ["==", ["get", "id"], sel]);
  map.setFilter("catchment-selected-line", ["==", ["get", "id"], sel]);
  map.setFilter("edges-highlight", ["all", ["==", ["get", "kind"], "hotspot"],
    ["any", ["==", ["get", "from"], sel], ["==", ["get", "to"], sel]]]);
}

// Dash pattern steps for the "flowing" effect (MapLibre's animated-line technique).
export const DASH_STEPS: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];
