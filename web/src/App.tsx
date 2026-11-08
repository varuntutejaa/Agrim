// Main page: hotspots on a map, with a risk view (Red/Amber/Green) and a
// drainage-network view.
// Mobile: map on top, panel below. Desktop: panel on the left, map on the right.
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchDrainage, fetchHotspots, fetchRain, fetchRisk } from "./api";
import DrainagePanel from "./components/DrainagePanel";
import HotspotMap from "./components/HotspotMap";
import RiskPanel from "./components/RiskPanel";
import type {
  DrainageLayers, HotspotCollection, RainCollection, RainWindow, RiskResult, RiskWindowKey, View,
} from "./types";

const VIEWS: { key: View; label: string }[] = [
  { key: "risk", label: "Flood risk" },
  { key: "drainage", label: "Drainage" },
];

// ?pin=1 turns on the "click to read coordinates" helper for the team.
const pinMode = new URLSearchParams(window.location.search).has("pin");

export default function App() {
  const [hotspots, setHotspots] = useState<HotspotCollection | null>(null);
  const [rain, setRain] = useState<RainCollection | null>(null);
  const [rainWindow, setRainWindow] = useState<RainWindow>("next_24h");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("risk");
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [riskWindow, setRiskWindow] = useState<RiskWindowKey>("next_24h");
  const [showRain, setShowRain] = useState(false);
  const [drainage, setDrainage] = useState<DrainageLayers | null>(null);
  const [drainageLoading, setDrainageLoading] = useState(false);

  useEffect(() => {
    fetchHotspots().then(setHotspots).catch((e) => setError(String(e)));
    fetchRain().then(setRain).catch((e) => setError(String(e)));
    fetchRisk().then(setRisk).catch((e) => setError(String(e)));
  }, []);

  // Copy each hotspot's risk level (for the chosen window) onto the map features.
  const mapHotspots = useMemo<HotspotCollection | null>(() => {
    if (!hotspots) return null;
    const byId = new Map(risk?.hotspots.map((h) => [h.id, h]) ?? []);
    return {
      ...hotspots,
      features: hotspots.features.map((f) => {
        const r = byId.get(f.properties.id);
        const level = r?.scored ? r.windows[riskWindow].level : "none";
        return { ...f, properties: { ...f.properties, level } };
      }),
    };
  }, [hotspots, risk, riskWindow]);

  // Drainage layers are only downloaded the first time that view is opened
  // (once: a failure shows the error banner instead of retrying in a loop).
  const drainageRequested = useRef(false);
  useEffect(() => {
    if (view !== "drainage" || drainageRequested.current) return;
    drainageRequested.current = true;
    setDrainageLoading(true);
    fetchDrainage()
      .then(setDrainage)
      .catch((e) => setError(String(e)))
      .finally(() => setDrainageLoading(false));
  }, [view]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight text-sky-900">Agrim</h1>
          <p className="text-xs text-slate-500">Gurugram flood watch</p>
        </div>
        <nav className="flex rounded-lg bg-slate-100 p-0.5" aria-label="Map view">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                view === v.key ? "bg-white text-sky-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-800">
          Could not reach the Agrim server ({error}). Is the API running?
        </div>
      )}
      {pinMode && (
        <div className="bg-sky-50 px-4 py-1.5 text-xs text-sky-900">
          Pin mode: click the map to read a location's coordinates.
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col md:flex-row-reverse">
        <div className="h-[55vh] shrink-0 md:h-auto md:flex-1">
          <HotspotMap
            hotspots={mapHotspots}
            risk={risk}
            riskWindow={riskWindow}
            rain={rain}
            showRain={showRain}
            rainWindow={rainWindow}
            view={view}
            drainage={drainage}
            selectedId={selectedId}
            onSelect={setSelectedId}
            pinMode={pinMode}
          />
        </div>
        <aside className="min-h-0 flex-1 overflow-y-auto border-slate-200 bg-slate-50 md:w-96 md:flex-none md:border-r">
          {view === "risk" ? (
            <RiskPanel
              risk={risk}
              riskWindow={riskWindow}
              onRiskWindow={setRiskWindow}
              rain={rain}
              showRain={showRain}
              onShowRain={setShowRain}
              rainWindow={rainWindow}
              onRainWindow={setRainWindow}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <DrainagePanel drainage={drainage} loading={drainageLoading} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </aside>
      </main>
    </div>
  );
}
