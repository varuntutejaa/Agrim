// Simulator view (for the jury demo): design a storm or replay a past day,
// and watch the ranking and the map change live. Always marked as an exercise.
import type { ReplayEvent, SimResult, StormParams } from "../types";
import Downstream from "./Downstream";
import RiskLedger from "./RiskLedger";
import RiskSummary from "./RiskSummary";
import { LEVEL_COLOR } from "../risk";
import { ExerciseBand, Kicker, Rule, Slider, TextTabs } from "./ui";

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
      <div className="space-y-7 px-5 pb-10 pt-5 md:px-7">
        <div className="flex items-end justify-between gap-3">
          <Kicker>Simulator</Kicker>
          <TextTabs
            label="Simulator mode"
            options={[{ key: "storm" as const, label: "Design a storm" }, { key: "replay" as const, label: "Replay a day" }]}
            value={p.mode}
            onChange={p.onMode}
          />
        </div>

        {p.mode === "storm" ? <StormControls {...p} /> : <ReplayControls {...p} />}

        <Rule />

        <div className={`transition-opacity duration-150 ${p.busy ? "opacity-60" : ""}`}>
          <RiskSummary counts={meta?.counts.next_24h} lead={meta?.mode === "replay" && event ? `With ${event.title}'s rain,` : "In this scenario,"} sub={sub} />
        </div>

        {result && <Downstream hotspots={result.hotspots} windowKey="next_24h" onSelect={p.onSelect} />}

        <section>
          <Kicker className="mb-2">Hotspots, highest risk first</Kicker>
          {result ? (
            <RiskLedger hotspots={result.hotspots} windowKey="next_24h" selectedId={p.selectedId} onSelect={p.onSelect} />
          ) : (
            <div className="h-64 animate-pulse bg-paper-2" />
          )}
        </section>

        <footer className="text-[12px] leading-relaxed text-ink-3">
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
    <div className="space-y-6">
      <div>
      <Kicker className="mb-1.5">Quick storms</Kicker>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {PRESETS.map((pr) => {
          const active = pr.p.rain_24h === storm.rain_24h && pr.p.peak1h === storm.peak1h;
          return (
            <button
              key={pr.label}
              onClick={() => onStorm(pr.p)}
              className={`text-[13px] underline-offset-4 ${active ? "font-medium text-ink underline decoration-2" : "text-ink-2 hover:text-ink hover:underline"}`}
            >
              {pr.label}
            </button>
          );
        })}
      </div>
      </div>

      <Slider label="Rain in 24 hours" unit="mm" min={0} max={200} value={storm.rain_24h}
        onChange={(v) => onStorm({ rain_24h: v, peak1h: Math.min(storm.peak1h, v) })}
        note={rarity && rarityNote(rarity.rain_24h, " at a typical hotspot")} />
      <Slider label="Heaviest single hour" unit="mm" min={0} max={80} value={storm.peak1h}
        onChange={(v) => onStorm({ peak1h: Math.min(v, storm.rain_24h) })}
        note={rarity && rarityNote(rarity.peak1h, "")} />
      <Slider label="Rain in the 3 days before" unit="mm" min={0} max={200} value={storm.past_72h}
        onChange={(v) => onStorm({ past_72h: v })} note="Wet ground can't soak up more water" />

      <div>
        <div className="flex items-center justify-between">
          <span className="kicker">Where it rains</span>
          <TextTabs
            label="Storm footprint"
            options={[{ key: "city" as const, label: "Whole city" }, { key: "local" as const, label: "Local storm" }]}
            value={storm.centre ? "local" : "city"}
            onChange={(k) => onStorm({ centre: k === "local" ? CITY_CENTRE : null })}
          />
        </div>
        {storm.centre && (
          <div className="mt-4 space-y-1">
            <Slider label="Storm radius" unit="km" min={2} max={15} value={storm.radius_km}
              onChange={(v) => onStorm({ radius_km: v })} />
            <p className="text-[12px] font-medium text-water">Tap the map to move the storm.</p>
          </div>
        )}
      </div>
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
      <ul className="border-t border-ink">
        {events.map((e) => {
          const active = e.date === replayDate;
          return (
            <li key={e.id} className="border-b border-rule">
              <button
                onClick={() => onReplay(e.date)}
                className={`grid w-full grid-cols-[1fr_auto] gap-x-3 py-3 text-left hover:bg-paper-2 ${active ? "bg-paper-2" : ""}`}
              >
                <span className="font-display text-[19px] font-medium leading-tight">
                  {e.title}
                  {active && <span className="ml-2 align-middle font-sans text-[11px] text-ink-3">▶ playing</span>}
                </span>
                <span className="font-mono tabular text-right text-[13px] text-ink-2">
                  {e.city_mean_mm.toFixed(0)}<span className="text-ink-3"> mm</span>
                </span>
                <span className="col-span-2 mt-0.5 text-[12px] text-ink-3">
                  <span className="kicker mr-1.5 !text-[10px]">{e.source === "team" ? "Team date" : "Model record"}</span>
                  {e.note}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <label className="flex items-center justify-between gap-3">
        <span className="kicker">Any monsoon day, 2018–2026</span>
        <select
          className="border border-ink bg-paper px-2 py-1 font-mono text-[12.5px]"
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
      <p className="text-[12px] text-ink-3">City average rain for the day shown on the right.</p>
    </div>
  );
}

/** Live counts pinned to the top of the panel, so they stay in view while dragging a slider. */
function Scoreboard({ result, busy }: { result: SimResult | null; busy: boolean }) {
  const c = result?.meta.counts.next_24h;
  const cells = [
    { level: "red" as const, label: "Likely" },
    { level: "amber" as const, label: "Possible" },
    { level: "green" as const, label: "Low" },
  ];
  return (
    <div className="sticky top-0 z-10 grid grid-cols-3 border-b border-ink bg-paper px-5 py-2.5 md:px-7">
      {cells.map(({ level, label }) => (
        <div key={level} className="flex items-baseline gap-2">
          <span
            className={`font-mono tabular text-[26px] font-medium leading-none transition-opacity ${busy ? "opacity-50" : ""}`}
            style={{ color: c && c[level] && level !== "green" ? LEVEL_COLOR[level] : undefined }}
          >
            {c ? c[level] : "–"}
          </span>
          <span className="kicker">{label}</span>
        </div>
      ))}
    </div>
  );
}
