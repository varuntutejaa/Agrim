// Agrim: three views over one map.
//   Forecast   live Red/Amber/Green risk per hotspot
//   Simulator  design a storm or replay a past day (always marked as an exercise)
//   Drainage   how water moves between hotspots
//   MCG desk   orders, SOP checklist, overrides and feedback for MCG officers
// Phone: map on top, panel below. Desktop: panel on the left, map on the right.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchDrainage, fetchHotspots, fetchRain, fetchReplayDates, fetchReplayEvents, fetchRisk, simulate,
} from "./api";
import DrainagePanel from "./components/DrainagePanel";
import ForecastPanel from "./components/ForecastPanel";
import HotspotMap, { type Storm } from "./components/HotspotMap";
import MapKey from "./components/MapKey";
import MapStamp from "./components/MapStamp";
import Masthead from "./components/Masthead";
import OpsDesk from "./components/OpsDesk";
import SimulatorPanel, { type SimMode } from "./components/SimulatorPanel";
import { ExerciseBand } from "./components/ui";
import type {
  DrainageLayers, HotspotCollection, OpsSource, RainCollection, RainWindow, ReplayEvent, RiskResult, RiskWindowKey,
  SimRequest, SimResult, StormParams, View,
} from "./types";

// ?pin=1 turns on the "click to read coordinates" helper for the team.
const pinMode = new URLSearchParams(window.location.search).has("pin");
const SIM_DEBOUNCE_MS = 120;

export default function App() {
  const [view, setView] = useState<View>("forecast");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live data
  const [hotspots, setHotspots] = useState<HotspotCollection | null>(null);
  const [rain, setRain] = useState<RainCollection | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [riskWindow, setRiskWindow] = useState<RiskWindowKey>("next_24h");
  const [showRain, setShowRain] = useState(false);
  const [rainWindow, setRainWindow] = useState<RainWindow>("next_24h");

  const refreshRisk = useCallback(() => {
    fetchRisk().then(setRisk).catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    fetchHotspots().then(setHotspots).catch((e) => setError(String(e)));
    fetchRain().then(setRain).catch((e) => setError(String(e)));
    refreshRisk();
  }, [refreshRisk]);

  // Drainage layers: downloaded the first time the drainage or simulator view opens.
  const [drainage, setDrainage] = useState<DrainageLayers | null>(null);
  const [drainageLoading, setDrainageLoading] = useState(false);
  const drainageRequested = useRef(false);
  useEffect(() => {
    if (view === "forecast" || view === "ops" || drainageRequested.current) return;
    drainageRequested.current = true;
    setDrainageLoading(true);
    fetchDrainage().then(setDrainage).catch((e) => setError(String(e))).finally(() => setDrainageLoading(false));
  }, [view]);

  // Simulator
  const [simMode, setSimMode] = useState<SimMode>("storm");
  const [storm, setStorm] = useState<StormParams>({ rain_24h: 90, peak1h: 25, past_72h: 40, centre: null, radius_km: 6 });
  const [replayDate, setReplayDate] = useState<string | null>(null);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [simNonce, setSimNonce] = useState(0); // bump to re-run after an exercise override
  const simListsRequested = useRef(false);
  const [opsSource, setOpsSource] = useState<OpsSource>("live");
  const simActive = view === "simulator" || (view === "ops" && opsSource === "exercise");
  const simRequest: SimRequest = simMode === "replay" && replayDate ? { mode: "replay", date: replayDate } : { mode: "storm", ...storm };

  useEffect(() => {
    if (view !== "simulator" || simListsRequested.current) return;
    simListsRequested.current = true;
    fetchReplayEvents().then((r) => setEvents(r.events)).catch((e) => setError(String(e)));
    fetchReplayDates().then((r) => setDates(r.dates)).catch(() => {});
  }, [view]);

  // Re-run the simulation whenever its inputs change (debounced; older requests cancelled).
  useEffect(() => {
    if (!simActive) return;
    if (simMode === "replay" && !replayDate) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSimBusy(true);
      const req = simMode === "replay" ? { mode: "replay" as const, date: replayDate! } : { mode: "storm" as const, ...storm };
      simulate(req, ctrl.signal)
        .then((r) => {
          setSimResult(r);
          setSimBusy(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setError(String(e));
            setSimBusy(false);
          }
        });
    }, SIM_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [simActive, simMode, storm, replayDate, simNonce]);

  const onSimMode = (m: SimMode) => {
    setSimMode(m);
    if (m === "replay" && !replayDate && events.length) {
      // Start on the wettest day in the record.
      setReplayDate((events.find((e) => e.id === "record-1") ?? events[0]).date);
    }
  };
  const onStorm = useCallback((patch: Partial<StormParams>) => setStorm((s) => ({ ...s, ...patch })), []);

  // What the map and list show: the simulation in the simulator, the live forecast elsewhere.
  const shown = view === "simulator" ? simResult : risk;
  const windowKey: RiskWindowKey = view === "simulator" ? "next_24h" : riskWindow;

  const levels = useMemo(() => {
    const m = new Map<string, string>();
    shown?.hotspots.forEach((h) => m.set(h.id, h.scored ? h.windows[windowKey].level : "none"));
    return m;
  }, [shown, windowKey]);

  const mapHotspots = useMemo<HotspotCollection | null>(() => {
    if (!hotspots) return null;
    return {
      ...hotspots,
      features: hotspots.features.map((f) => ({ ...f, properties: { ...f.properties, level: levels.get(f.properties.id) ?? "none" } })),
    };
  }, [hotspots, levels]);

  // Flow paths take the level of the hotspot they start from.
  const edges = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!drainage) return null;
    return {
      ...drainage.network.edges,
      features: drainage.network.edges.features.map((f) => ({
        ...f, properties: { ...f.properties, level: levels.get(f.properties.from) ?? "none" },
      })),
    };
  }, [drainage, levels]);

  const localStorm = view === "simulator" && simMode === "storm" && storm.centre !== null;
  const mapStorm: Storm | null = localStorm ? { centre: storm.centre!, radius_km: storm.radius_km } : null;
  const onMapClick = useMemo(
    () => (localStorm ? (lonLat: [number, number]) => setStorm((s) => ({ ...s, centre: lonLat })) : undefined),
    [localStorm],
  );

  const updated = risk
    ? new Date(risk.meta.generated_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) + " IST"
    : undefined;

  if (view === "ops") {
    return (
      <div className="flex h-full flex-col">
        <Masthead view={view} onView={setView} updated={updated} />
        <div className="min-h-0 flex-1 overflow-y-auto bg-paper">
          <OpsDesk
            source={opsSource}
            onSource={setOpsSource}
            risk={risk}
            riskWindow={riskWindow}
            onRiskWindow={setRiskWindow}
            simResult={simResult}
            simRequest={simRequest}
            onChanged={() => (opsSource === "exercise" ? setSimNonce((n) => n + 1) : refreshRisk())}
            onOpenSimulator={() => setView("simulator")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Masthead view={view} onView={setView} updated={updated} />

      {error && (
        <div className="flex items-center gap-3 border-b border-risk-red bg-paper-2 px-5 py-2 text-[13px] text-risk-red md:px-7">
          Could not reach the Agrim server. Is the API running? <span className="font-mono text-[11px] text-ink-3">{error}</span>
          <button className="ml-auto text-ink-3 hover:text-ink" onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {pinMode && (
        <div className="border-b border-rule bg-paper-2 px-5 py-1.5 text-[12px] text-water md:px-7">
          Pin mode: click the map to read a location's coordinates.
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative h-[46vh] shrink-0 md:order-2 md:h-auto md:flex-1">
          <HotspotMap
            hotspots={mapHotspots}
            riskList={shown?.hotspots ?? null}
            windowKey={windowKey}
            rain={rain}
            showRain={showRain}
            rainWindow={rainWindow}
            view={view}
            drainage={drainage}
            edges={edges}
            storm={mapStorm}
            onMapClick={onMapClick}
            selectedId={selectedId}
            onSelect={setSelectedId}
            pinMode={pinMode}
          />
          {view === "simulator" && (
            <>
              <div className="pointer-events-none absolute left-0 right-0 top-0">
                <ExerciseBand compact label={simResult?.meta.exercise_label ?? "EXERCISE / अभ्यास"} note="Simulated rain" />
              </div>
              <MapStamp result={simResult} storm={storm} />
            </>
          )}
          <MapKey view={view} />
        </div>

        <aside className="min-h-0 flex-1 overflow-y-auto border-t border-ink bg-paper md:order-1 md:w-[440px] md:flex-none md:border-r md:border-t-0">
          {view === "forecast" && (
            <ForecastPanel
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
          )}
          {view === "simulator" && (
            <SimulatorPanel
              mode={simMode}
              onMode={onSimMode}
              storm={storm}
              onStorm={onStorm}
              events={events}
              dates={dates}
              replayDate={replayDate}
              onReplay={setReplayDate}
              result={simResult}
              busy={simBusy}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
          {view === "drainage" && (
            <DrainagePanel drainage={drainage} loading={drainageLoading} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </aside>
      </main>
    </div>
  );
}
