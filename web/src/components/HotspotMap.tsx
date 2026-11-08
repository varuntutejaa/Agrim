// The map. MapLibre is imperative, so the map is created once and React
// props are pushed into it. Layers, bottom to top: basemap (recoloured to
// match the paper), rain grid, drainage, storm footprint, flow paths,
// hotspot halos, hotspots, labels.
import { useEffect, useRef, useState } from "react";
import maplibregl, { type ExpressionSpecification, type GeoJSONSource } from "maplibre-gl";
import type {
  DrainageLayers, HotspotCollection, HotspotRisk, NetworkNodeProps, RainCollection, RainWindow, RiskWindowKey, View,
} from "../types";
import { nearestRain } from "../geo";
import { LEVEL_COLOR, LEVEL_LONG, confidenceLabel, wetWindowLabel } from "../risk";
import {
  DASH_STEPS, addDrainageLayers, highlightDrainage, setDrainageData, setDrainageMode, setEdges,
} from "./drainageLayers";

// Free vector basemap, no API key (https://openfreemap.org), recoloured on load.
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const GURUGRAM_CENTER: [number, number] = [77.035, 28.455];
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const rainColor = (w: RainWindow): ExpressionSpecification => [
  "interpolate", ["linear"], ["get", w], 0, "#dfe7ec", 5, "#a9c0d0", 20, "#5f89a8", 50, "#24527a",
];
const levelColor: ExpressionSpecification = [
  "match", ["get", "level"],
  "red", LEVEL_COLOR.red, "amber", LEVEL_COLOR.amber, "green", LEVEL_COLOR.green, LEVEL_COLOR.none,
];

export type Storm = { centre: [number, number]; radius_km: number };

type Props = {
  hotspots: HotspotCollection | null; // features carry a "level" property
  riskList: HotspotRisk[] | null;
  windowKey: RiskWindowKey;
  rain: RainCollection | null;
  showRain: boolean;
  rainWindow: RainWindow;
  view: View;
  drainage: DrainageLayers | null;
  edges: GeoJSON.FeatureCollection | null; // flow paths with a "level" from their upstream hotspot
  storm: Storm | null;
  onMapClick?: (lonLat: [number, number]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  pinMode: boolean;
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Recolour the positron basemap to sit quietly under the data. */
function restyleBasemap(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    try {
      if (layer.type === "background") map.setPaintProperty(id, "background-color", "#eeeae0");
      else if (layer.type === "fill") {
        if (/water/.test(id)) map.setPaintProperty(id, "fill-color", "#cdd8de");
        else if (/building/.test(id)) map.setPaintProperty(id, "fill-color", "#e4dfd3");
        else if (/park|wood|grass|landcover|landuse|forest/.test(id)) map.setPaintProperty(id, "fill-color", "#e6e1d4");
      } else if (layer.type === "line") {
        if (/water|river|stream|canal/.test(id)) map.setPaintProperty(id, "line-color", "#bccbd4");
        else if (/boundary|admin/.test(id)) map.setPaintProperty(id, "line-color", "#c8bfae");
      } else if (layer.type === "symbol" && map.getLayoutProperty(id, "text-field") !== undefined) {
        map.setPaintProperty(id, "text-color", "#8b877e");
        map.setPaintProperty(id, "text-halo-color", "#eeeae0");
      }
    } catch {
      /* some layers use expressions we leave alone */
    }
  }
}

/** Circle polygon around a lon/lat, radius in km. */
function circle(centre: [number, number], km: number, steps = 72): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lon, lat] = centre;
  const dLat = km / 110.57;
  const dLon = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI;
    return [lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)];
  });
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} };
}

function stormData(storm: Storm | null): GeoJSON.FeatureCollection {
  if (!storm) return EMPTY;
  return {
    type: "FeatureCollection",
    features: [
      { ...circle(storm.centre, storm.radius_km * 2), properties: { ring: "outer" } },
      { ...circle(storm.centre, storm.radius_km), properties: { ring: "core" } },
      { type: "Feature", geometry: { type: "Point", coordinates: storm.centre }, properties: { ring: "centre" } },
    ],
  };
}

export default function HotspotMap(props: Props) {
  const { hotspots, rain, showRain, rainWindow, view, drainage, edges, storm, selectedId } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Closing a popup ourselves (to open another) must not count as the user closing it.
  const closingRef = useRef(false);
  const closePopup = () => {
    closingRef.current = true;
    popupRef.current?.remove();
    closingRef.current = false;
  };

  // Handlers are registered once, so they read the latest props through a ref.
  const latest = useRef(props);
  latest.current = props;

  // 1) Create the map and its layers once.
  useEffect(() => {
    const narrow = window.innerWidth < 768;
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: BASEMAP_STYLE,
      center: GURUGRAM_CENTER,
      zoom: narrow ? 10.6 : 11.4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      restyleBasemap(map);
      for (const id of ["rain", "hotspots", "storm"]) map.addSource(id, { type: "geojson", data: EMPTY });

      map.addLayer({ id: "rain-grid", type: "circle", source: "rain", layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 7, 13, 24, 15, 50],
          "circle-color": rainColor("next_24h"),
          "circle-opacity": 0.5,
          "circle-blur": 0.6,
        } });

      map.addLayer({ id: "storm-outer", type: "fill", source: "storm", filter: ["==", ["get", "ring"], "outer"],
        paint: { "fill-color": "#24527a", "fill-opacity": 0.06 } });
      map.addLayer({ id: "storm-core", type: "fill", source: "storm", filter: ["==", ["get", "ring"], "core"],
        paint: { "fill-color": "#24527a", "fill-opacity": 0.1 } });
      map.addLayer({ id: "storm-line", type: "line", source: "storm", filter: ["==", ["get", "ring"], "core"],
        paint: { "line-color": "#24527a", "line-width": 1.2, "line-dasharray": [3, 2] } });
      map.addLayer({ id: "storm-centre", type: "circle", source: "storm", filter: ["==", ["get", "ring"], "centre"],
        paint: { "circle-radius": 5, "circle-color": "#24527a", "circle-stroke-color": "#f5f2eb", "circle-stroke-width": 2 } });

      // Hotspot layers first, so drainage can be inserted beneath them.
      map.addLayer({ id: "hotspot-halo", type: "circle", source: "hotspots", filter: ["==", ["get", "level"], "red"],
        paint: { "circle-radius": 12, "circle-color": LEVEL_COLOR.red, "circle-opacity": 0.3 } });
      map.addLayer({ id: "hotspot-selected", type: "circle", source: "hotspots", filter: ["==", ["get", "id"], ""],
        paint: { "circle-radius": 15, "circle-color": "transparent", "circle-stroke-color": "#17191e", "circle-stroke-width": 1.5 } });
      map.addLayer({ id: "hotspots", type: "circle", source: "hotspots",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"],
            10, ["match", ["get", "level"], "red", 7, "amber", 6, 4.5],
            14, ["match", ["get", "level"], "red", 11, "amber", 10, 8]],
          "circle-color": levelColor,
          "circle-stroke-color": "#f5f2eb",
          "circle-stroke-width": 1.8,
        } });
      const label = (id: string, filter: maplibregl.FilterSpecification, minzoom: number) =>
        map.addLayer({ id, type: "symbol", source: "hotspots", minzoom, filter,
          layout: {
            "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11.5,
            "text-offset": [0, 1.15], "text-anchor": "top", "text-max-width": 9,
          },
          paint: { "text-color": "#17191e", "text-halo-color": "#f5f2eb", "text-halo-width": 1.6 } });
      label("labels-risk", ["in", ["get", "level"], ["literal", ["red", "amber"]]], 10);
      label("labels-other", ["!", ["in", ["get", "level"], ["literal", ["red", "amber"]]]], 12.5);

      addDrainageLayers(map, "hotspot-halo");

      map.on("click", "hotspots", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) latest.current.onSelect(id);
      });
      map.on("mouseenter", "hotspots", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "hotspots", () => (map.getCanvas().style.cursor = latest.current.onMapClick ? "crosshair" : ""));

      map.on("click", (e) => {
        if (map.queryRenderedFeatures(e.point, { layers: ["hotspots"] }).length) return;
        const { onMapClick, pinMode: pin } = latest.current;
        if (onMapClick) {
          onMapClick([e.lngLat.lng, e.lngLat.lat]);
        } else if (pin) {
          const text = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
          closePopup();
          popupRef.current = new maplibregl.Popup({ maxWidth: "260px" })
            .setLngLat(e.lngLat)
            .setHTML(`<div class="kicker">lat, lon</div><div class="font-mono text-[13px]">${text}</div>
              <div class="mt-1 text-[12px] text-ink-2">Paste into data/hotspots.csv and set geocode_source = manual.</div>`)
            .addTo(map);
        }
      });

      setLoaded(true);
    });

    // Animation: pulsing halo on Red hotspots, moving dashes on at-risk flow paths.
    let frame = 0;
    let lastHalo = 0;
    let lastStep = -1;
    const animate = (t: number) => {
      frame = requestAnimationFrame(animate);
      if (!map.isStyleLoaded() || !map.getLayer("hotspot-halo") || document.hidden) return;
      if (t - lastHalo > 33) {
        lastHalo = t;
        const phase = (t % 1800) / 1800;
        map.setPaintProperty("hotspot-halo", "circle-radius", 9 + 20 * phase);
        map.setPaintProperty("hotspot-halo", "circle-opacity", 0.35 * (1 - phase));
      }
      const step = Math.floor(t / 70) % DASH_STEPS.length;
      if (step !== lastStep) {
        lastStep = step;
        map.setPaintProperty("edges-flow", "line-dasharray", DASH_STEPS[step]);
      }
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      map.remove();
    };
  }, []);

  const map = loaded ? mapRef.current : null;

  // 2) Data into the map.
  useEffect(() => {
    if (map && hotspots) (map.getSource("hotspots") as GeoJSONSource).setData(hotspots);
  }, [map, hotspots]);
  useEffect(() => {
    if (map && rain) (map.getSource("rain") as GeoJSONSource).setData(rain);
  }, [map, rain]);
  useEffect(() => {
    if (map) map.setPaintProperty("rain-grid", "circle-color", rainColor(rainWindow));
  }, [map, rainWindow]);
  useEffect(() => {
    if (map && drainage) setDrainageData(map, drainage, edges ?? drainage.network.edges);
  }, [map, drainage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (map && edges) setEdges(map, edges);
  }, [map, edges]);
  useEffect(() => {
    if (map) (map.getSource("storm") as GeoJSONSource).setData(stormData(storm));
  }, [map, storm]);

  // 3) Which layers show in which view.
  useEffect(() => {
    if (!map) return;
    map.setLayoutProperty("rain-grid", "visibility", view === "forecast" && showRain ? "visible" : "none");
    setDrainageMode(map, view === "drainage" ? "full" : view === "simulator" ? "edges" : "off");
    map.getCanvas().style.cursor = props.onMapClick ? "crosshair" : "";
  }, [map, view, showRain, props.onMapClick]);

  // 4) Selected hotspot: ring, fly there, popup.
  useEffect(() => {
    if (!map || !hotspots) return;
    map.setFilter("hotspot-selected", ["==", ["get", "id"], selectedId ?? ""]);
    highlightDrainage(map, selectedId);
    closePopup();
    const f = hotspots.features.find((h) => h.properties.id === selectedId);
    if (!f) return;
    const [lon, lat] = f.geometry.coordinates;
    map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 12.8), duration: 700 });
    popupRef.current = new maplibregl.Popup({ maxWidth: "300px", offset: 14 })
      .setLngLat([lon, lat])
      .setHTML(popupHtml(f.properties.id, f.properties.name, latest.current))
      .addTo(map);
    popupRef.current.on("close", () => {
      if (!closingRef.current) latest.current.onSelect(null);
    });
  }, [map, hotspots, selectedId, props.riskList, props.windowKey, drainage]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="h-full w-full" />;
}

function popupHtml(id: string, name: string, p: Props): string {
  const h = p.riskList?.find((x) => x.id === id);
  let risk = "";
  if (h?.scored) {
    const w = h.windows[p.windowKey];
    const sub = [confidenceLabel(w), wetWindowLabel(w) && `wettest ${wetWindowLabel(w)}`].filter(Boolean).join(" · ");
    risk = `
      <div class="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium" style="color:${LEVEL_COLOR[w.level]}">
        <span style="display:inline-block;width:8px;height:8px;background:${LEVEL_COLOR[w.level]}"></span>${LEVEL_LONG[w.level]}
      </div>
      ${sub ? `<div class="font-mono text-[11px] text-ink-3">${esc(sub)}</div>` : ""}
      ${w.level !== "green" ? `<div class="mt-1.5 text-[12.5px] font-medium">${esc(w.action)}</div>` : ""}
      <ul class="mt-1.5 space-y-0.5 text-[12px] text-ink-2">${w.drivers.map((d) => `<li>– ${esc(d)}</li>`).join("")}</ul>
      <div class="mt-1.5 font-mono text-[11px] text-ink-3">${w.rain.rain_24h} mm in 24 h · peak ${w.rain.peak1h} mm/h</div>`;
  } else {
    const coords = p.hotspots?.features.find((f) => f.properties.id === id)?.geometry.coordinates;
    const r = coords ? nearestRain(p.rain, coords[0], coords[1]) : null;
    if (r) risk = `<div class="mt-1 font-mono text-[11px] text-ink-3">${r.next_24h} mm forecast in 24 h</div>`;
  }
  return `<div class="font-display text-[18px] font-medium leading-tight">${esc(name)}</div>
    ${risk}${networkLines(p.drainage, id)}`;
}

// Drainage facts for the popup (empty until drainage data has loaded).
function networkLines(drainage: DrainageLayers | null, id: string): string {
  const nodes = drainage?.network.nodes.features;
  const n = nodes?.find((f) => f.properties.id === id)?.properties as NetworkNodeProps | undefined;
  if (!nodes || !n) return "";
  const name = (hid: string) => esc(nodes.find((f) => f.properties.id === hid)?.properties.name ?? hid);
  const parts = [
    n.downstream.length ? `Water flows on to ${n.downstream.map(name).join(", ")}.` : "",
    n.upstream.length ? `Receives water from ${n.upstream.map(name).join(", ")}.` : "",
  ].filter(Boolean);
  return parts.length
    ? `<div class="mt-2 border-t border-rule pt-1.5 text-[12px] text-ink-2">${parts.join(" ")}</div>`
    : "";
}
