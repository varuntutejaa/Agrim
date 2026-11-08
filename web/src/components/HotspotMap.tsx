// The map: hotspots coloured by flood risk, over an optional rain grid (risk
// view) or the drainage network (drainage view).
// MapLibre is imperative, so we create the map once and push data into it
// whenever React props change.
import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type ExpressionSpecification } from "maplibre-gl";
import type {
  DrainageLayers, HotspotCollection, NetworkNodeProps, RainCollection, RainWindow, RiskResult, RiskWindowKey, View,
} from "../types";
import { LEVEL_COLOR, LEVEL_LABEL, confidenceLabel, wetWindowLabel } from "../risk";
import { nearestRain } from "../geo";
import { addDrainageLayers, highlightDrainage, setDrainageData, setDrainageVisible } from "./drainageLayers";

// Free vector basemap, no API key (https://openfreemap.org).
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const GURUGRAM_CENTER: [number, number] = [77.04, 28.45];

// Blue scale for rain in mm. Red/Amber/Green are reserved for flood risk.
const rainColor = (window: RainWindow): ExpressionSpecification => [
  "interpolate", ["linear"], ["get", window],
  0, "#e0f2fe", 5, "#7dd3fc", 20, "#0284c7", 50, "#1e3a8a",
];

type Props = {
  hotspots: HotspotCollection | null; // with a "level" property per feature (red/amber/green/none)
  risk: RiskResult | null;
  riskWindow: RiskWindowKey;
  rain: RainCollection | null;
  showRain: boolean;
  rainWindow: RainWindow;
  view: View;
  drainage: DrainageLayers | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  pinMode: boolean; // ?pin=1: click anywhere to read coordinates (for pinning hotspots by hand)
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default function HotspotMap(props: Props) {
  const { hotspots, risk, riskWindow, rain, showRain, rainWindow, view, drainage, selectedId, onSelect, pinMode } = props;
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

  // Event handlers are registered once, so they read the latest props through refs.
  const latest = useRef({ onSelect, pinMode, rain, drainage, risk, riskWindow });
  latest.current = { onSelect, pinMode, rain, drainage, risk, riskWindow };

  // 1) Create the map and its layers once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: BASEMAP_STYLE,
      center: GURUGRAM_CENTER,
      zoom: 11.3,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      map.addSource("rain", { type: "geojson", data: empty });
      map.addSource("hotspots", { type: "geojson", data: empty });

      map.addLayer({
        id: "rain-grid",
        type: "circle",
        source: "rain",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 6, 13, 20, 15, 45],
          "circle-color": rainColor("next_24h"),
          "circle-opacity": 0.45,
          "circle-blur": 0.4,
        },
      });
      map.addLayer({
        id: "hotspot-selected",
        type: "circle",
        source: "hotspots",
        filter: ["==", ["get", "id"], ""],
        paint: { "circle-radius": 14, "circle-color": "#1e3a8a", "circle-opacity": 0.2 },
      });
      map.addLayer({
        id: "hotspots",
        type: "circle",
        source: "hotspots",
        paint: {
          // Red spots drawn a little larger so they stand out on a phone.
          "circle-radius": ["interpolate", ["linear"], ["zoom"],
            10, ["match", ["get", "level"], "red", 7, 5],
            14, ["match", ["get", "level"], "red", 12, 9]],
          "circle-color": ["match", ["get", "level"],
            "red", LEVEL_COLOR.red, "amber", LEVEL_COLOR.amber, "green", LEVEL_COLOR.green, LEVEL_COLOR.none],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "hotspot-labels",
        type: "symbol",
        source: "hotspots",
        minzoom: 12,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-max-width": 10,
        },
        paint: { "text-color": "#1e293b", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      });

      addDrainageLayers(map, "hotspot-selected");

      map.on("click", "hotspots", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) latest.current.onSelect(id);
      });
      map.on("mouseenter", "hotspots", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "hotspots", () => (map.getCanvas().style.cursor = ""));

      // Pin helper: click empty map to read coordinates.
      map.on("click", (e) => {
        if (!latest.current.pinMode) return;
        if (map.queryRenderedFeatures(e.point, { layers: ["hotspots"] }).length) return;
        const text = `${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`;
        closePopup();
        popupRef.current = new maplibregl.Popup({ maxWidth: "260px" })
          .setLngLat(e.lngLat)
          .setHTML(`<div class="text-xs"><b>lat, lon</b><br/><code>${text}</code><br/>
            Paste into data/hotspots.csv and set geocode_source = manual.</div>`)
          .addTo(map);
      });

      setLoaded(true);
    });

    return () => map.remove();
  }, []);

  // 2) Push data into the map when it changes.
  useEffect(() => {
    if (loaded && hotspots) (mapRef.current!.getSource("hotspots") as GeoJSONSource).setData(hotspots);
  }, [loaded, hotspots]);

  useEffect(() => {
    if (loaded && rain) (mapRef.current!.getSource("rain") as GeoJSONSource).setData(rain);
  }, [loaded, rain]);

  useEffect(() => {
    if (loaded) mapRef.current!.setPaintProperty("rain-grid", "circle-color", rainColor(rainWindow));
  }, [loaded, rainWindow]);

  useEffect(() => {
    if (loaded && drainage) setDrainageData(mapRef.current!, drainage);
  }, [loaded, drainage]);

  // Switch views: rain grid in the rain view, drainage layers in the drainage view.
  useEffect(() => {
    if (!loaded) return;
    const map = mapRef.current!;
    map.setLayoutProperty("rain-grid", "visibility", view === "risk" && showRain ? "visible" : "none");
    setDrainageVisible(map, view === "drainage");
  }, [loaded, view, showRain]);

  // 3) Selected hotspot: highlight, fly there, open a popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !hotspots) return;
    map.setFilter("hotspot-selected", ["==", ["get", "id"], selectedId ?? ""]);
    highlightDrainage(map, selectedId);
    closePopup();
    const f = hotspots.features.find((h) => h.properties.id === selectedId);
    if (!f) return;

    const [lon, lat] = f.geometry.coordinates;
    const p = f.properties;
    const r = nearestRain(latest.current.rain, lon, lat);
    const rainLine = r
      ? `Rain, mean of models: next 24 h <b>${r.next_24h} mm</b> · past 72 h ${r.past_72h} mm`
      : "No forecast loaded yet.";
    const pinNote = p.verified
      ? "Location checked by the team."
      : `Location not yet checked. Geocoder matched: ${escapeHtml(p.geocode_label || "?")}`;

    map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 13), duration: 800 });
    popupRef.current = new maplibregl.Popup({ maxWidth: "280px", offset: 12 })
      .setLngLat([lon, lat])
      .setHTML(
        `<div class="text-sm leading-snug">
          <div class="font-semibold">${escapeHtml(p.name)}</div>
          <div class="text-xs text-slate-500 mb-1">${escapeHtml(p.id)} · ${escapeHtml(p.location_kind)}</div>
          ${riskLines(latest.current.risk, latest.current.riskWindow, p.id)}
          <div class="text-xs mb-1">${rainLine}</div>
          ${networkLines(latest.current.drainage, p.id)}
          <div class="text-xs text-slate-500">${pinNote}</div>
          ${p.notes ? `<div class="text-xs text-slate-500 mt-1">${escapeHtml(p.notes)}</div>` : ""}
        </div>`,
      )
      .addTo(map);
    popupRef.current.on("close", () => {
      if (!closingRef.current) latest.current.onSelect(null);
    });
  }, [loaded, hotspots, selectedId, drainage, risk, riskWindow]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// Drainage facts for the popup (empty until the drainage view has been opened once).
function networkLines(drainage: DrainageLayers | null, id: string): string {
  const nodes = drainage?.network.nodes.features;
  const n = nodes?.find((f) => f.properties.id === id)?.properties as NetworkNodeProps | undefined;
  if (!nodes || !n) return "";
  const name = (hid: string) => escapeHtml(nodes.find((f) => f.properties.id === hid)?.properties.name ?? hid);
  const down = n.downstream.length ? `Water flows on to: ${n.downstream.map(name).join(", ")}` : "No other hotspot downstream.";
  const up = n.upstream.length ? `Receives water from: ${n.upstream.map(name).join(", ")}` : "";
  return `<div class="text-xs mb-1 border-t border-slate-200 pt-1">
    Drains ${n.max_drained_km2_150m} km² upstream · ${n.relief_1km_m < 0 ? `${Math.abs(n.relief_1km_m)} m below` : `${n.relief_1km_m} m above`} its surroundings
    · ${Math.round(n.builtup_share_500m * 100)}% built-up nearby<br/>${down}${up ? `<br/>${up}` : ""}</div>`;
}

// Risk summary for the popup.
function riskLines(risk: RiskResult | null, win: RiskWindowKey, id: string): string {
  const h = risk?.hotspots.find((x) => x.id === id);
  if (!h || !h.scored) return "";
  const w = h.windows[win];
  const sub = [confidenceLabel(w), wetWindowLabel(w) && `wettest ${wetWindowLabel(w)}`].filter(Boolean).join(" · ");
  return `<div class="text-xs mb-1">
    <b style="color:${LEVEL_COLOR[w.level]}">${LEVEL_LABEL[w.level]}</b>${sub ? ` · ${escapeHtml(sub)}` : ""}
    ${w.level !== "green" ? `<div class="font-medium">${escapeHtml(w.action)}</div>` : ""}
    <ul class="list-disc pl-4 text-slate-600">${w.drivers.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>
  </div>`;
}
