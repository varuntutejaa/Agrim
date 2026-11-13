// Agrim: one map, several views, each with its own address (#/forecast ...).
//   Home       what Agrim is, and where to go
//   Forecast   live Red/Amber/Green risk per hotspot (English / Hindi)
//   Simulator  design a storm, replay a past day, block a drain (always an exercise)
//   Drainage   how water moves, critical points, proposed sensors
//   MCG desk   orders, SOP checklist, overrides, alerts, scorecard
//   About      team, backtest, public overrides, data & assumptions, sources
// Phone: map on top, panel below. Desktop: panel on the left, map on the right.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCritical, fetchDrainage, fetchHotspots, fetchProposedSensors, fetchRain, fetchReplayDates, fetchReplayEvents,
  fetchRisk, simulate,
} from "./api";
import AboutSection from "./components/about/AboutSection";
import DrainagePanel, { type DrainageMode } from "./components/DrainagePanel";
import ForecastPanel from "./components/ForecastPanel";
import HotspotMap, { type Storm } from "./components/HotspotMap";
import LandingPage from "./components/LandingPage";
import MapKey from "./components/MapKey";
import MapStamp from "./components/MapStamp";
import Masthead from "./components/Masthead";
import OpsDesk from "./components/OpsDesk";
import SimulatorPanel, { type SimMode } from "./components/SimulatorPanel";
import { ExerciseBand } from "./components/ui";
import { type Lang, savedLang, saveLang } from "./i18n";
import { useRoute } from "./route";
import type {
  CriticalNodes, DrainageLayers, HotspotCollection, OpsSource, ProposedSensors, RainCollection, RainWindow, ReplayEvent,
  RiskResult, RiskWindowKey, SimRequest, SimResult, StormParams,
} from "./types";

// ?pin=1 turns on the "click to read coordinates" helper for the team.
const pinMode = new URLSearchParams(window.location.search).has("pin");
const SIM_DEBOUNCE_MS = 120;
const STALE_HOURS = 12;
const NO_BLOCKS: string[] = [];   // blocked drains only show in the simulator

export default function App() {
  const [route, go] = useRoute();
  const view = route.view;

  // Hindi applies to the public views (home, forecast) and the masthead; officer tools stay in English.
  const [langChoice, setLangChoice] = useState<Lang>(savedLang);
  const lang: Lang = view === "forecast" ? langChoice : "en";
  const onLang = (l: Lang) => {
    setLangChoice(l);
    saveLang(l);
  };
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
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
    fetchRisk()
      .then(setRisk)
      .catch((e) => setError(/503/.test(String(e))
        ? "The forecast is being refreshed. Try again in a minute."
        : "Couldn't reach the Agrim server. The free server may be waking up (up to a minute)."));
  }, []);
  useEffect(() => {
    fetchHotspots().then(setHotspots).catch(() => setError("Couldn't reach the Agrim server. It may be waking up."));
    fetchRain().then(setRain).catch(() => {});
    refreshRisk();
  }, [refreshRisk]);

  const ageHours = risk ? (Date.now() - new Date(risk.meta.generated_at).getTime()) / 3.6e6 : null;
  const stale = ageHours !== null && ageHours > STALE_HOURS;

  // Drainage layers, critical points and sensors: fetched the first time a map view needs them.
  const [drainage, setDrainage] = useState<DrainageLayers | null>(null);
  const [drainageLoading, setDrainageLoading] = useState(false);
  const [critical, setCritical] = useState<CriticalNodes | null>(null);
  const [sensors, setSensors] = useState<ProposedSensors | null>(null);
  const [drainageMode, setDrainageMode] = useState<DrainageMode>("links");
  const [showSensors, setShowSensors] = useState(false);
  const drainageRequested = useRef(false);
  useEffect(() => {
    if ((view !== "drainage" && view !== "simulator") || drainageRequested.current) return;
    drainageRequested.current = true;
    setDrainageLoading(true);
    fetchDrainage().then(setDrainage).catch(() => setError("Couldn't load the drainage network.")).finally(() => setDrainageLoading(false));
    fetchCritical().then(setCritical).catch(() => {});
  }, [view]);
  useEffect(() => {
    if (showSensors && !sensors) fetchProposedSensors().then(setSensors).catch(() => {});
  }, [showSensors, sensors]);

  // Simulator
  const [simMode, setSimMode] = useState<SimMode>("storm");
  const [storm, setStorm] = useState<StormParams>({ rain_24h: 90, peak1h: 25, past_72h: 40, centre: null, radius_km: 6 });
  const [replayDate, setReplayDate] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [simNonce, setSimNonce] = useState(0); // bump to re-run after an exercise override
  const simListsRequested = useRef(false);
  const [opsSource, setOpsSource] = useState<OpsSource>("live");
  const simActive = view === "simulator" || (view === "ops" && opsSource === "exercise");
  const simRequest: SimRequest = useMemo(
    () => ({ ...(simMode === "replay" && replayDate ? { mode: "replay" as const, date: replayDate } : { mode: "storm" as const, ...storm }), blocked }),
    [simMode, replayDate, storm, blocked],
  );
  const toggleBlock = useCallback((id: string) => setBlocked((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id])), []);

  useEffect(() => {
    if (view !== "simulator" || simListsRequested.current) return;
    simListsRequested.current = true;
    fetchReplayEvents().then((r) => setEvents(r.events)).catch(() => {});
    fetchReplayDates().then((r) => setDates(r.dates)).catch(() => {});
  }, [view]);

  // Re-run the simulation whenever its inputs change (debounced; older requests cancelled).
  useEffect(() => {
    if (!simActive) return;
    if (simMode === "replay" && !replayDate) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSimBusy(true);
      simulate(simRequest, ctrl.signal)
        .then((r) => {
          setSimResult(r);
          setSimBusy(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setError("The simulator couldn't reach the server. It may be waking up.");
            setSimBusy(false);
          }
        });
    }, SIM_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [simActive, simRequest, simNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSimMode = (m: SimMode) => {
    setSimMode(m);
    if (m === "replay" && !replayDate && events.length) {
      setReplayDate((events.find((e) => e.id === "record-1") ?? events[0]).date);   // the wettest day on record
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
  const masthead = <Masthead view={view} onView={(v) => go(v)} updated={updated} lang={langChoice} onLang={onLang} stale={stale} />;
  const errorBar = error && (
    <div role="alert" className="flex items-center gap-3 border-b-2 border-ink bg-accent-2 px-4 py-2 text-[14px] font-medium text-ink md:px-6">
      {error}
      <button type="button" className="btn btn--sm ml-auto" onClick={() => { setError(null); refreshRisk(); }}>Retry</button>
    </div>
  );

  // Full-page views (no map).
  if (view === "home" || view === "about" || view === "ops") {
    return (
      <div className="flex h-full flex-col">
        {masthead}
        {errorBar}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-clip bg-paper">
          {view === "home" && <LandingPage risk={risk} ageHours={ageHours} go={go} />}
          {view === "about" && <AboutSection tab={route.tab} onTab={(t) => go("about", t)} />}
          {view === "ops" && (
            <OpsDesk
              source={opsSource}
              onSource={setOpsSource}
              risk={risk}
              riskWindow={riskWindow}
              onRiskWindow={setRiskWindow}
              simResult={simResult}
              simRequest={simRequest}
              onChanged={() => (opsSource === "exercise" ? setSimNonce((n) => n + 1) : refreshRisk())}
              onOpenSimulator={() => go("simulator")}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {masthead}
      {errorBar}
      {pinMode && (
        <div className="border-b border-rule bg-paper-2 px-4 py-2 text-[13px] text-ink md:px-6">
          Pin mode: click the map to read a location's coordinates.
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative h-[46dvh] shrink-0 md:order-2 md:h-auto md:flex-1">
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
            lang={lang}
            critical={critical}
            criticalVisible={(view === "drainage" && drainageMode === "critical") || view === "simulator"}
            blockedIds={view === "simulator" ? blocked : NO_BLOCKS}
            onNodeClick={view === "simulator" ? toggleBlock : undefined}
            sensors={sensors}
            showSensors={view === "drainage" && showSensors}
          />
          {view === "simulator" && (
            <>
              <div className="pointer-events-none absolute left-0 right-0 top-0">
                <ExerciseBand compact label={simResult?.meta.exercise_label ?? "EXERCISE / अभ्यास"} note="Simulated rain" />
              </div>
              <MapStamp result={simResult} storm={storm} />
            </>
          )}
          {view === "drainage" && showSensors && (
            <div className="pointer-events-none absolute left-0 right-0 top-0">
              <ExerciseBand compact label="Proposed, illustrative" note="Sensor sites are proposals, not installed sensors" />
            </div>
          )}
          <MapKey view={view} lang={lang} critical={drainageMode === "critical"} sensors={showSensors} />
        </div>

        <aside className="min-h-0 flex-1 overflow-y-auto overflow-x-clip border-t-2 border-ink bg-paper md:order-1 md:w-[30rem] md:flex-none md:border-r-2 md:border-t-0">
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
              lang={lang}
              ageHours={ageHours}
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
              critical={critical}
              blocked={blocked}
              onToggleBlock={toggleBlock}
            />
          )}
          {view === "drainage" && (
            <DrainagePanel
              drainage={drainage}
              loading={drainageLoading}
              selectedId={selectedId}
              onSelect={setSelectedId}
              mode={drainageMode}
              onMode={setDrainageMode}
              critical={critical}
              showSensors={showSensors}
              onShowSensors={setShowSensors}
              sensorCounts={sensors?.meta.counts ?? null}
            />
          )}
        </aside>
      </main>
    </div>
  );
}
