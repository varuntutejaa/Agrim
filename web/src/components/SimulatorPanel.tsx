// Simulator view (for the jury demo): design a storm or replay a past day,
// and watch the ranking and the map change live. Always marked as an exercise.
import { useState } from "react";
import type { CriticalNodes, ReplayEvent, SimResult, StormParams } from "../types";
import Downstream from "./Downstream";
import RiskLedger from "./RiskLedger";
import RiskSummary from "./RiskSummary";
import { ExerciseBand, Rule, Slider, TextTabs } from "./ui";

export type SimMode = "storm" | "replay";

type Props = {
  mode: SimMode;
  onMode: (m: SimMode) => void;
  storm: StormParams;
  onStorm: (patch: Partial<StormParams>) => void;
  events: ReplayEvent[];
  dates: string[];
  replayDate: string | null;
  onReplay: (date: string) => void;
  result: SimResult | null;
  busy: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  critical: CriticalNodes | null;
  blocked: string[];
  onToggleBlock: (nodeId: string) => void;
};

// Presets named by how often the model sees rain like this (see model/rules.how_often).
const PRESETS: { label: string; p: Pick<StormParams, "rain_24h" | "peak1h" | "past_72h"> }[] = [
  { label: "Wet day", p: { rain_24h: 20, peak1h: 5, past_72h: 15 } },
  { label: "Once a monsoon", p: { rain_24h: 40, peak1h: 12, past_72h: 30 } },
  { label: "Once a decade", p: { rain_24h: 90, peak1h: 25, past_72h: 40 } },
  { label: "Beyond the record", p: { rain_24h: 150, peak1h: 40, past_72h: 60 } },
];
export const CITY_CENTRE: [number, number] = [77.03, 28.45];

/** "Seen about once a monsoon at a typical hotspot", or "Beyond anything on record here since 2018". */
function rarityNote(text: string, where: string) {
  if (text.startsWith("beyond") || text.startsWith("an ordinary")) return text[0].toUpperCase() + text.slice(1) + ".";
  return `Seen ${text}${where}.`;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function SimulatorPanel(p: Props) {
  const { storm, result } = p;
  const meta = result?.meta;
  const event = meta?.mode === "replay" ? meta.event : null;
  const sub =
    meta?.mode === "replay"
      ? `${event ? event.note + " " : ""}Model rain from the ECMWF record, not rain-gauge readings.`
      : storm.centre
        ? `A ${storm.radius_km} km storm centred where you tapped; rain fades with distance.`
        : "The same rain everywhere in the city.";

  return (
    <div>
      {/* On phones the band on the map already says this. */}
      <ExerciseBand className="!hidden md:!flex" label={meta?.exercise_label ?? "EXERCISE / अभ्यास"} note="Simulation, not a live warning" />
      <Scoreboard result={result} busy={p.busy} />
      <div className="space-y-8 px-4 pb-12 pt-5 md:px-6">
        <TextTabs
          label="Simulator mode"
          options={[{ key: "storm" as const, label: "Design a storm" }, { key: "replay" as const, label: "Replay a day" }]}
          value={p.mode}
          onChange={p.onMode}
        />

        {p.mode === "storm" ? <StormControls {...p} /> : <ReplayControls {...p} />}

        <BlockDrain critical={p.critical} blocked={p.blocked} onToggle={p.onToggleBlock} result={result} />

        <Rule strong />

        <div className={`transition-opacity duration-150 ${p.busy ? "opacity-60" : ""}`}>
          <RiskSummary counts={meta?.counts.next_24h} lead={meta?.mode === "replay" && event ? `With ${event.title}'s rain,` : "In this scenario,"} sub={sub} />
        </div>

        {result && <Downstream hotspots={result.hotspots} windowKey="next_24h" onSelect={p.onSelect} />}

        <section>
          <h3 className="h-sub mb-3">Hotspots, highest risk first</h3>
          {result ? (
            <RiskLedger hotspots={result.hotspots} windowKey="next_24h" selectedId={p.selectedId} onSelect={p.onSelect} />
          ) : (
            <div className="h-64 bg-paper-2" aria-label="Loading" />
          )}
        </section>

        <footer className="text-[13px] leading-relaxed text-muted">
          {meta?.note} {meta?.note_hi} Same rules as the live forecast (docs/MODEL.md). Rain amounts are model-scale:
          the forecast models read lower than rain gauges in short cloudbursts.
        </footer>
      </div>
    </div>
  );
}

function StormControls({ storm, onStorm, result }: Props) {
  const rarity = result?.meta.mode === "storm" ? result.meta.rarity : undefined;
  return (
    <div className="space-y-8">
      <fieldset className="m-0 border-0 p-0">
        <legend className="label mb-2 p-0">Quick storms</legend>
        <div className="cells-grid">
          {PRESETS.map((pr) => {
            const active = pr.p.rain_24h === storm.rain_24h && pr.p.peak1h === storm.peak1h;
            return (
              <button key={pr.label} type="button" aria-pressed={active} onClick={() => onStorm(pr.p)} className="cell min-h-10">
                {pr.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Slider label="Rain in 24 hours" unit="mm" min={0} max={200} value={storm.rain_24h}
        onChange={(v) => onStorm({ rain_24h: v, peak1h: Math.min(storm.peak1h, v) })}
        note={rarity && rarityNote(rarity.rain_24h, " at a typical hotspot")} />
      <Slider label="Heaviest single hour" unit="mm" min={0} max={80} value={storm.peak1h}
        onChange={(v) => onStorm({ peak1h: Math.min(v, storm.rain_24h) })}
        note={rarity && rarityNote(rarity.peak1h, "")} />
      <Slider label="Rain in the 3 days before" unit="mm" min={0} max={200} value={storm.past_72h}
        onChange={(v) => onStorm({ past_72h: v })} note="Wet ground can't soak up more water" />

      <fieldset className="m-0 border-0 p-0">
        <legend className="label mb-2 p-0">Where it rains</legend>
        <TextTabs
          label="Storm footprint"
          options={[{ key: "city" as const, label: "Whole city" }, { key: "local" as const, label: "Local storm" }]}
          value={storm.centre ? "local" : "city"}
          onChange={(k) => onStorm({ centre: k === "local" ? CITY_CENTRE : null })}
        />
        {storm.centre && (
          <div className="mt-5 space-y-2">
            <Slider label="Storm radius" unit="km" min={2} max={15} value={storm.radius_km}
              onChange={(v) => onStorm({ radius_km: v })} />
            <p className="text-[14px] font-semibold text-accent">Tap the map to move the storm.</p>
          </div>
        )}
      </fieldset>
    </div>
  );
}

function ReplayControls({ events, dates, replayDate, onReplay }: Props) {
  const byYear = dates.reduce<Record<string, string[]>>((acc, d) => {
    (acc[d.slice(0, 4)] ??= []).push(d);
    return acc;
  }, {});
  return (
    <div className="space-y-5">
      <ul className="m-0 list-none border-t border-rule p-0">
        {events.map((e) => {
          const active = e.date === replayDate;
          return (
            <li key={e.id} className="border-b border-rule">
              <button
                type="button"
                onClick={() => onReplay(e.date)}
                aria-pressed={active}
                className={`row-btn grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-1 py-3 ${active ? "bg-paper-2" : ""}`}
              >
                <span className="text-[18px] font-display font-medium leading-tight tracking-[-0.02em]">
                  {e.title}
                  {active && <span className="ml-2 align-middle text-[13px] font-semibold tracking-normal text-accent">Playing</span>}
                </span>
                <span className="text-right text-[16px] font-semibold">
                  {e.city_mean_mm.toFixed(0)}{"\u00a0"}<span className="text-[13px] font-medium text-muted">mm</span>
                </span>
                <span className="col-span-2 mt-1 text-[13px] leading-relaxed text-muted">
                  <span className="font-medium text-ink-2">{e.source === "team" ? "Team date." : "Model record."}</span> {e.note}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <label className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[14px] font-medium">Any monsoon day, 2018 to 2026</span>
        <select
          className="field"
          value={replayDate ?? ""}
          onChange={(e) => e.target.value && onReplay(e.target.value)}
        >
          <option value="">Pick a date</option>
          {Object.entries(byYear).map(([year, ds]) => (
            <optgroup key={year} label={year}>
              {ds.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <p className="text-[13px] text-muted">City average rain for the day shown on the right.</p>
    </div>
  );
}

/** Live counts pinned to the top of the panel, so they stay in view while dragging a slider. */
function Scoreboard({ result, busy }: { result: SimResult | null; busy: boolean }) {
  const c = result?.meta.counts.next_24h;
  const cells = [
    { level: "red" as const, label: "High", fill: "text-risk-red" },
    { level: "amber" as const, label: "Medium", fill: "text-risk-amber" },
    { level: "green" as const, label: "Low", fill: "" },
  ];
  return (
    <div className="sticky top-0 z-10 grid grid-cols-3 border-b border-rule bg-paper-2">
      {cells.map(({ level, label, fill }) => {
        const on = !!c && c[level] > 0 && level !== "green";
        return (
          <div key={level} className={`flex items-baseline gap-2 border-l border-rule px-4 py-2.5 first:border-l-0 md:px-6 ${on ? fill : ""}`}>
            <span className={`text-[28px] font-display font-medium leading-none tracking-[-0.02em] transition-opacity ${busy ? "opacity-50" : ""}`}>
              {c ? c[level] : "0"}
            </span>
            <span className={`text-[13px] font-medium ${on ? "" : "text-ink-2"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** "Block a drain": mark outfalls blocked and watch the hotspots whose water must pass them back up. */
function BlockDrain({ critical, blocked, onToggle, result }: {
  critical: CriticalNodes | null;
  blocked: string[];
  onToggle: (id: string) => void;
  result: SimResult | null;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!critical) return null;
  const list = critical.features.map((f) => f.properties);
  const shown = showAll ? list : list.filter((p) => p.n_hotspots > 1 || blocked.includes(p.id));
  const effect = result?.meta.blocked ?? [];
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="h-sub">Block a drain</h2>
        {blocked.length > 0 && (
          <button type="button" className="btn btn--sm" onClick={() => blocked.forEach(onToggle)}>Clear all</button>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Tick an outfall, or tap a blue point on the map. Water that must pass a blocked drain backs up, so the hotspots
        upstream of it flood first.
      </p>
      <ul className="m-0 mt-3 list-none border-y border-rule p-0">
        {shown.map((p) => (
          <li key={p.id} className="border-b border-rule last:border-b-0">
            <label className="flex cursor-pointer items-start gap-3 py-2.5 text-[14px] hover:bg-paper-2">
              <input type="checkbox" className="check mt-0.5 shrink-0" checked={blocked.includes(p.id)} onChange={() => onToggle(p.id)} />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{p.label}</span>
                {p.upstream_names.length > 0 && <span className="mt-0.5 block text-[13px] text-muted">drains {p.upstream_names.join(", ")}</span>}
              </span>
              <span className="pr-1 text-[16px] font-semibold">{p.n_hotspots}</span>
            </label>
          </li>
        ))}
      </ul>
      {!showAll && list.length > shown.length && (
        <button type="button" className="link mt-2 text-[13px]" onClick={() => setShowAll(true)}>
          Show all {list.length} outfalls
        </button>
      )}
      {effect.length > 0 && (
        <p className="mt-3 rounded-card border border-rule bg-paper-3 px-3 py-2.5 text-[14px] leading-relaxed text-ink">
          <span className="status status--red mr-2 align-middle">Blocked</span>
          {effect.map((b) => b.label).join(", ")}. {new Set(effect.flatMap((b) => b.hotspots)).size} hotspot(s)
          back up behind it (marked “drain blocked downstream”).
        </p>
      )}
    </section>
  );
}
