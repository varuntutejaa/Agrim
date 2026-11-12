// One screen that tells a first-time visitor (or a judge) what Agrim is and where to go.
import type { RiskResult, View } from "../types";
import { LEVEL_COLOR } from "../risk";

type Props = { risk: RiskResult | null; ageHours: number | null; go: (v: View, tab?: "backtest" | "data" | "sources") => void };

function Cta({ title, text, onClick, primary = false }: { title: string; text: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className={`group flex flex-col justify-between border p-5 text-left transition-colors ${primary ? "border-ink bg-ink text-paper hover:bg-ink-2" : "border-ink bg-paper hover:bg-paper-2"}`}>
      <span className="font-display text-[24px] font-medium leading-tight">{title} <span className="inline-block transition-transform group-hover:translate-x-1">→</span></span>
      <span className={`mt-3 text-[13.5px] leading-snug ${primary ? "text-paper/80" : "text-ink-2"}`}>{text}</span>
    </button>
  );
}

export default function LandingPage({ risk, ageHours, go }: Props) {
  const c = risk?.meta.counts.next_24h;
  const updated = risk && new Date(risk.meta.generated_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <div className="mx-auto flex min-h-full max-w-[1100px] flex-col justify-center px-5 py-10 md:px-8">
      <div className="kicker">Gurugram · SustainX 2026 prototype</div>
      <h1 className="mt-2 max-w-[900px] font-display text-[36px] font-medium leading-[1.08] tracking-[-0.015em] md:text-[54px]">
        Agrim tells Gurugram which waterlogging hotspots will flood in the next 24–48 hours, and what MCG crews should do first.
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-ink py-3 text-[14px]">
        <span className="kicker">Today, next 24 h</span>
        {c ? (
          <>
            {(["red", "amber", "green"] as const).map((l) => (
              <span key={l} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5" style={{ background: LEVEL_COLOR[l] }} />
                <b className="font-mono">{c[l]}</b> {l === "red" ? "high" : l === "amber" ? "medium" : "low"}
              </span>
            ))}
            <span className={`font-mono text-[12px] ${ageHours !== null && ageHours > 12 ? "text-risk-amber" : "text-ink-3"}`}>
              updated {updated} IST{ageHours !== null && ageHours > 12 ? ` · ${Math.round(ageHours)} h old` : ""}
            </span>
          </>
        ) : (
          <span className="text-ink-3">Loading today's forecast… (the free server can take up to a minute to wake)</span>
        )}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Cta primary title="See today's forecast" text="Red / Amber / Green for every mapped hotspot, the reasons, and roads to avoid. English and हिन्दी." onClick={() => go("forecast")} />
        <Cta title="Run a storm" text="Design a storm, replay a past monsoon day, or block a drain and watch which hotspots back up." onClick={() => go("simulator")} />
        <Cta title="MCG desk" text="Orders per zone, the T-24 to T+24 checklist, officer overrides, citizen alerts and the scorecard." onClick={() => go("ops")} />
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
        <button className="underline-offset-4 hover:underline" onClick={() => go("drainage")}>Critical drain points →</button>
        <button className="underline-offset-4 hover:underline" onClick={() => go("about", "backtest")}>Backtest on past floods →</button>
        <button className="underline-offset-4 hover:underline" onClick={() => go("about", "data")}>Data & assumptions →</button>
        <button className="underline-offset-4 hover:underline" onClick={() => go("about", "sources")}>Sources & credits →</button>
      </div>

      <p className="mt-8 max-w-[760px] text-[12.5px] leading-relaxed text-ink-3">
        21 of MCG's 159 hotspots are mapped, from public reports; the full list needs MCG data. Rain comes from three
        global weather models, judged against each hotspot's own 2018–2026 record, plus terrain and drains. Everything
        simulated is marked as an exercise.
      </p>
    </div>
  );
}
