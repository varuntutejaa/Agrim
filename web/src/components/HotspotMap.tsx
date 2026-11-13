// The map. MapLibre is imperative, so the map is created once and React
// props are pushed into it. Layers, bottom to top: basemap (recoloured to
// match the paper's cool grey), rain grid, drainage, storm footprint, flow paths,
// hotspot halos, hotspots, labels.
import { useEffect, useRef, useState } from "react";
import maplibregl, { type ExpressionSpecification, type GeoJSONSource } from "maplibre-gl";
import type {
  DrainageLayers, HotspotCollection, HotspotRisk, NetworkNodeProps, RainCollection, RainWindow, RiskWindowKey, View,
} from "../types";
import { nearestRain } from "../geo";
import { LEVEL_COLOR } from "../risk";
import { MAP } from "../mapColors";
import { type Lang, actionText, locale, reasons, t } from "../i18n";
import {
  DASH_STEPS, addDrainageLayers, highlightDrainage, setDrainageData, setDrainageMode, setEdges,
} from "./drainageLayers";

// Free vector basemap, no API key (https://openfreemap.org), recoloured on load.
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const GURUGRAM_CENTER: [number, number] = [77.035, 28.455];
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const rainColor = (w: RainWindow): ExpressionSpecification => [
  "interpolate", ["linear"], ["get", w], 0, MAP.rain[0], 5, MAP.rain[1], 20, MAP.rain[2], 50, MAP.rain[3],
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
  lang?: Lang;
  critical?: GeoJSON.FeatureCollection | null;   // outfalls ranked by hotspots served
  criticalVisible?: boolean;
  blockedIds?: string[];                          // simulator: outfalls marked blocked
  onNodeClick?: (nodeId: string) => void;         // simulator: toggle a blockage
  sensors?: GeoJSON.FeatureCollection | null;     // proposed sensor sites (illustrative)
  showSensors?: boolean;
};

const SENSOR_COLOR: ExpressionSpecification = ["match", ["get", "kind"],
  "rain_gauge", MAP.water, "drain_sensor", MAP.drain, "underpass_monitor", MAP.amber, MAP.muted];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Recolour the positron basemap to a city at night, quiet under the data. */
function restyleBasemap(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    try {
      if (layer.type === "background") map.setPaintProperty(id, "background-color", MAP.base.background);
      else if (layer.type === "fill") {
        if (/water/.test(id)) map.setPaintProperty(id, "fill-color", MAP.base.water);
        else if (/building/.test(id)) map.setPaintProperty(id, "fill-color", MAP.base.building);
        else if (/park|wood|grass|forest/.test(id)) map.setPaintProperty(id, "fill-color", MAP.base.green);
        else map.setPaintProperty(id, "fill-color", MAP.base.land);
      } else if (layer.type === "line") {
        if (/water|river|stream|canal/.test(id)) map.setPaintProperty(id, "line-color", MAP.base.waterLine);
        else if (/boundary|admin/.test(id)) map.setPaintProperty(id, "line-color", MAP.base.boundary);
        else if (/casing/.test(id)) map.setPaintProperty(id, "line-color", MAP.base.background);
        else if (/motorway|trunk|major|primary/.test(id)) map.setPaintProperty(id, "line-color", MAP.base.roadMajor);
        else map.setPaintProperty(id, "line-color", MAP.base.road);
      } else if (layer.type === "symbol" && /shield/.test(id)) {
        map.setLayoutProperty(id, "visibility", "none");   // white road shields glare on the night map
      } else if (layer.type === "symbol" && map.getLayoutProperty(id, "text-field") !== undefined) {
        map.setPaintProperty(id, "text-color", MAP.base.label);
        map.setPaintProperty(id, "text-halo-color", MAP.base.background);
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
      for (const id of ["rain", "hotspots", "storm", "critical", "sensors"]) map.addSource(id, { type: "geojson", data: EMPTY });

      map.addLayer({ id: "rain-grid", type: "circle", source: "rain", layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 7, 13, 24, 15, 50],
          "circle-color": rainColor("next_24h"),
          "circle-opacity": 0.5,
          "circle-blur": 0.6,
        } });

      map.addLayer({ id: "storm-outer", type: "fill", source: "storm", filter: ["==", ["get", "ring"], "outer"],
        paint: { "fill-color": MAP.water, "fill-opacity": 0.06 } });
      map.addLayer({ id: "storm-core", type: "fill", source: "storm", filter: ["==", ["get", "ring"], "core"],
        paint: { "fill-color": MAP.water, "fill-opacity": 0.1 } });
      map.addLayer({ id: "storm-line", type: "line", source: "storm", filter: ["==", ["get", "ring"], "core"],
        paint: { "line-color": MAP.water, "line-width": 1.2, "line-dasharray": [3, 2] } });
      map.addLayer({ id: "storm-centre", type: "circle", source: "storm", filter: ["==", ["get", "ring"], "centre"],
        paint: { "circle-radius": 5, "circle-color": MAP.water, "circle-stroke-color": MAP.paper3, "circle-stroke-width": 2 } });

      // Hotspot layers first, so drainage can be inserted beneath them.
      map.addLayer({ id: "hotspot-halo", type: "circle", source: "hotspots", filter: ["==", ["get", "level"], "red"],
        paint: { "circle-radius": 16, "circle-color": LEVEL_COLOR.red, "circle-opacity": 0.22 } });
      map.addLayer({ id: "hotspot-selected", type: "circle", source: "hotspots", filter: ["==", ["get", "id"], ""],
        paint: { "circle-radius": 15, "circle-color": "transparent", "circle-stroke-color": MAP.ink, "circle-stroke-width": 1.5 } });
      map.addLayer({ id: "hotspots", type: "circle", source: "hotspots",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"],
            10, ["match", ["get", "level"], "red", 7, "amber", 6, 4.5],
            14, ["match", ["get", "level"], "red", 11, "amber", 10, 8]],
          "circle-color": levelColor,
          "circle-stroke-color": MAP.paper3,
          "circle-stroke-width": 1.8,
        } });
      const label = (id: string, filter: maplibregl.FilterSpecification, minzoom: number) =>
        map.addLayer({ id, type: "symbol", source: "hotspots", minzoom, filter,
          layout: {
            // Words as well as colour, so the map works for colour-blind readers and in print.
            "text-field": ["case",
              ["==", ["get", "level"], "red"], ["concat", ["get", "name"], "\nHigh"],
              ["==", ["get", "level"], "amber"], ["concat", ["get", "name"], "\nMedium"],
              ["get", "name"]],
            "text-font": ["Noto Sans Regular"], "text-size": 11.5,
            "text-offset": [0, 1.15], "text-anchor": "top", "text-max-width": 9,
          },
          paint: { "text-color": MAP.ink, "text-halo-color": MAP.paper3, "text-halo-width": 1.6 } });
      label("labels-risk", ["in", ["get", "level"], ["literal", ["red", "amber"]]], 10);
      label("labels-other", ["!", ["in", ["get", "level"], ["literal", ["red", "amber"]]]], 12.5);

      addDrainageLayers(map, "hotspot-halo");

      // Proposed sensors (illustrative) and critical outfalls sit just under the hotspots.
      map.addLayer({ id: "sensors", type: "circle", source: "sensors", layout: { visibility: "none" },
        paint: {
          "circle-radius": ["match", ["get", "kind"], "rain_gauge", 6, "underpass_monitor", 6, 4],
          "circle-color": ["match", ["get", "kind"], "rain_gauge", MAP.paper3, SENSOR_COLOR],
          "circle-stroke-color": ["match", ["get", "kind"], "underpass_monitor", MAP.ink, SENSOR_COLOR],
          "circle-stroke-width": ["match", ["get", "kind"], "rain_gauge", 2.5, 1.2],
        } }, "hotspot-halo");
      map.addLayer({ id: "critical-circle", type: "circle", source: "critical", layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "n_hotspots"], 1, 7, 6, 17],
          "circle-color": MAP.water, "circle-opacity": 0.9,
          "circle-stroke-color": MAP.paper3, "circle-stroke-width": 2,
        } }, "hotspot-halo");
      // The count is a small badge to the upper right, drawn on top so the hotspot dot can't hide it.
      map.addLayer({ id: "critical-label", type: "symbol", source: "critical", layout: {
          visibility: "none", "text-field": "", "text-font": ["Noto Sans Regular"],
          "text-size": 11, "text-offset": [1.15, -1.15], "text-allow-overlap": true, "text-ignore-placement": true,
        }, paint: { "text-color": MAP.paper3, "text-halo-color": MAP.water, "text-halo-width": 4 } });

      map.on("click", "critical-circle", (e) => {
        const p = e.features?.[0]?.properties;
        if (!p) return;
        if (latest.current.onNodeClick) latest.current.onNodeClick(p.id as string);
        else latest.current.onSelect(p.hotspot_id as string);
      });
      map.on("click", "sensors", (e) => {
        const p = e.features?.[0]?.properties;
        if (!p) return;
        closePopup();
        popupRef.current = new maplibregl.Popup({ maxWidth: "260px" }).setLngLat(e.lngLat)
          .setHTML(`<span class="tag">Proposed, illustrative</span>
            <div class="mt-2 text-[14px] font-semibold">${esc(String(p.label))}</div>
            <div class="mt-1 text-[13px] text-ink-2">${esc(String(p.why))}</div>`)
          .addTo(map);
      });
      for (const id of ["critical-circle", "sensors"]) {
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = latest.current.onMapClick ? "crosshair" : ""));
      }

      map.on("click", "hotspots", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) latest.current.onSelect(id);
      });
      map.on("mouseenter", "hotspots", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "hotspots", () => (map.getCanvas().style.cursor = latest.current.onMapClick ? "crosshair" : ""));

      map.on("click", (e) => {
        const hit = ["hotspots", "critical-circle", "sensors"].filter((l) => map.getLayer(l) && map.getLayoutProperty(l, "visibility") !== "none");
        if (map.queryRenderedFeatures(e.point, { layers: hit }).length) return;
        const { onMapClick, pinMode: pin } = latest.current;
        if (onMapClick) {
          onMapClick([e.lngLat.lng, e.lngLat.lat]);
        } else if (pin) {
          const text = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
          closePopup();
          popupRef.current = new maplibregl.Popup({ maxWidth: "260px" })
            .setLngLat(e.lngLat)
            .setHTML(`<div class="label">lat, lon</div><div class="text-[14px] font-semibold">${text}</div>
              <div class="mt-1 text-[13px] text-ink-2">Paste into data/hotspots.csv and set geocode_source = manual.</div>`)
            .addTo(map);
        }
      });

      setLoaded(true);
    });

    // Animation: moving dashes on at-risk flow paths, so risk is seen travelling
    // downstream. Off when the reader asks for reduced motion, and while the tab is hidden.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastStep = -1;
    const animate = (t: number) => {
      frame = requestAnimationFrame(animate);
      if (still.matches || !map.isStyleLoaded() || !map.getLayer("edges-flow") || document.hidden) return;
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

  useEffect(() => {
    if (map && props.critical) (map.getSource("critical") as GeoJSONSource).setData(props.critical);
  }, [map, props.critical]);
  useEffect(() => {
    if (map && props.sensors) (map.getSource("sensors") as GeoJSONSource).setData(props.sensors);
  }, [map, props.sensors]);
  useEffect(() => {
    if (!map) return;
    const vis = props.criticalVisible ? "visible" : "none";
    map.setLayoutProperty("critical-circle", "visibility", vis);
    map.setLayoutProperty("critical-label", "visibility", vis);
    map.setLayoutProperty("sensors", "visibility", props.showSensors ? "visible" : "none");
    // Blocked outfalls: ink with a red ring, and a cross instead of the count.
    const ids = props.blockedIds ?? [];
    const isBlocked: ExpressionSpecification = ["in", ["get", "id"], ["literal", ids]];
    map.setPaintProperty("critical-circle", "circle-color", ["case", isBlocked, MAP.ink, MAP.water]);
    map.setPaintProperty("critical-circle", "circle-stroke-color", ["case", isBlocked, LEVEL_COLOR.red, MAP.paper3]);
    map.setPaintProperty("critical-circle", "circle-stroke-width", ["case", isBlocked, 3.5, 2]);
    // Badges only where they say something: outfalls serving 2+ hotspots, and blocked ones.
    map.setLayoutProperty("critical-label", "text-field", ["case", isBlocked, "×",
      [">=", ["get", "n_hotspots"], 2], ["to-string", ["get", "n_hotspots"]], ""]);
    map.setPaintProperty("critical-label", "text-halo-color", ["case", isBlocked, LEVEL_COLOR.red, MAP.water]);
  }, [map, props.criticalVisible, props.showSensors, props.blockedIds]);

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
    popupRef.current = new maplibregl.Popup({ maxWidth: "300px", offset: 14, focusAfterOpen: false })
      .setLngLat([lon, lat])
      .setHTML(popupHtml(f.properties.id, f.properties.name, latest.current))
      .addTo(map);
    popupRef.current.on("close", () => {
      if (!closingRef.current) latest.current.onSelect(null);
    });
  }, [map, hotspots, selectedId, props.riskList, props.windowKey, drainage, props.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="h-full w-full" />;
}

function popupHtml(id: string, name: string, p: Props): string {
  const lang = p.lang ?? "en";
  const s = t(lang);
  const h = p.riskList?.find((x) => x.id === id);
  let risk = "";
  if (h?.scored) {
    const w = h.windows[p.windowKey];
    const ww = w.rain.wet_window;
    const hour = (iso: string) => new Date(iso).toLocaleTimeString(locale(lang), { hour: "numeric", hour12: true });
    const sub = [w.confidence && s.confidence[w.confidence], ww && `${s.wettestAt} ${hour(ww.start)} ${lang === "hi" ? "से" : "to"} ${hour(ww.end)}`]
      .filter(Boolean).join(". ");
    risk = `
      <div class="mt-2"><span class="status status--${w.level}">${esc(s.levelLong[w.level])}</span></div>
      ${sub ? `<div class="mt-2 text-[13px] text-muted">${esc(sub)}</div>` : ""}
      ${w.models ? `<div class="mt-1 text-[13px] text-ink-2">${esc(s.models(w.models.flooding, w.models.total))}</div>` : ""}
      ${w.level !== "green" ? `<div class="mt-2 text-[14px] font-semibold leading-snug">${esc(actionText(w, lang))}</div>` : ""}
      <ul class="m-0 mt-2 list-none space-y-1 p-0 text-[13px] text-ink-2">${reasons(w, lang).map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
      <div class="mt-2 text-[13px] text-muted">${esc(s.popupRain(w.rain.rain_24h, w.rain.peak1h))}</div>`;
  } else {
    const coords = p.hotspots?.features.find((f) => f.properties.id === id)?.geometry.coordinates;
    const r = coords ? nearestRain(p.rain, coords[0], coords[1]) : null;
    if (r) risk = `<div class="mt-1 text-[13px] text-muted">${r.next_24h} mm forecast in 24 h</div>`;
  }
  return `<div class="pr-5 text-[18px] font-semibold leading-tight tracking-[-0.02em]">${esc(name)}</div>
    ${risk}${networkLines(p.drainage, id, lang)}`;
}

// Drainage facts for the popup (empty until drainage data has loaded).
function networkLines(drainage: DrainageLayers | null, id: string, lang: Lang = "en"): string {
  const nodes = drainage?.network.nodes.features;
  const n = nodes?.find((f) => f.properties.id === id)?.properties as NetworkNodeProps | undefined;
  if (!nodes || !n) return "";
  const name = (hid: string) => esc(nodes.find((f) => f.properties.id === hid)?.properties.name ?? hid);
  const parts = [
    n.downstream.length ? t(lang).flowsTo(n.downstream.map(name).join(", ")) : "",
    n.upstream.length ? t(lang).receivesFrom(n.upstream.map(name).join(", ")) : "",
  ].filter(Boolean);
  return parts.length
    ? `<div class="mt-3 border-t border-rule pt-2 text-[13px] text-ink-2">${parts.join(" ")}</div>`
    : "";
}
