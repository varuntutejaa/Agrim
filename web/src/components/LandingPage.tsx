// One screen that tells a first-time visitor (or a judge) what Agrim is and where to go.
// The hero carries the product itself: today's live forecast set as a departure board.
import type { HotspotRisk, RiskLevel, RiskResult, View } from "../types";
import { LEVEL_BG, LEVEL_LABEL } from "../risk";

type Props = { risk: RiskResult | null; ageHours: number | null; go: (v: View, tab?: "backtest" | "data" | "sources") => void };

const BOARD_ROWS = 6;
const MORE = "row-btn whitespace-nowrap border-b border-rule py-4 text-[15px] font-medium underline decoration-1 underline-offset-[0.2em] md:pr-4";

function Status({ level }: { level: RiskLevel }) {
  return <span className={`status status--${level}`}>{LEVEL_LABEL[level]}</span>;
}

/** Today's forecast as a board: the counts, then the hotspots most at risk. */
function Board({ risk, ageHours }: { risk: RiskResult | null; ageHours: number | null }) {
  const c = risk?.meta.counts.next_24h;
  const rows = (risk?.hotspots ?? []).filter((h): h is Extract<HotspotRisk, { scored: true }> => h.scored).slice(0, BOARD_ROWS);
  const updated = risk && new Date(risk.meta.generated_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  const old = ageHours !== null && ageHours > 12;
  return (
    <figure className="plate m-0 w-full" aria-label="Today's forecast board">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-ink-rule px-5 py-4">
        <span className="text-[18px] font-extrabold tracking-[-0.02em]">Today, next 24 h</span>
        <span className="text-[13px] text-paper-dim">Gurugram</span>
      </div>
      {c ? (
        <>
          <dl className="m-0 grid grid-cols-3 border-b-2 border-ink-rule">
            {(["red", "amber", "green"] as const).map((l) => (
              <div key={l} className="border-l-2 border-ink-rule px-5 py-3 first:border-l-0">
                <dt className="flex items-center gap-2 text-[13px] text-paper-dim">
                  <span className={`inline-block h-2.5 w-2.5 ${LEVEL_BG[l]}`} aria-hidden />
                  {l === "red" ? "high" : l === "amber" ? "medium" : "low"}
                </dt>
                <dd className="m-0 mt-1 text-[40px] font-extrabold leading-none tracking-[-0.04em] text-paper">{c[l]}</dd>
              </div>
            ))}
          </dl>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[13px] text-paper-dim">
                <th scope="col" className="px-5 pb-2 pt-3 font-medium">Hotspot</th>
                <th scope="col" className="pb-2 pt-3 text-right font-medium">Rain</th>
                <th scope="col" className="px-5 pb-2 pt-3 text-right font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => {
                const w = h.windows.next_24h;
                return (
                  <tr key={h.id} className="border-t border-ink-rule">
                    <td className="px-5 py-2.5 text-[15px] font-medium">{h.name}</td>
                    <td className="figure whitespace-nowrap py-2.5 text-right text-[18px]">
                      {w.rain.rain_24h.toFixed(0)}{"\u00a0"}<span className="text-[13px] font-medium text-paper-dim">mm</span>
                    </td>
                    <td className="px-5 py-2.5 text-right"><Status level={w.level} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <figcaption className={`border-t-2 border-ink-rule px-5 py-3 text-[13px] ${old ? "font-extrabold text-accent-2" : "text-paper-dim"}`}>
            Live forecast, updated {updated} IST{old ? `, ${Math.round(ageHours!)} h old` : ""}. The {rows.length} hotspots most at risk.
          </figcaption>
        </>
      ) : (
        <p className="px-5 py-10 text-[14px] text-paper-dim">
          Loading today's forecast… (the free server can take up to a minute to wake)
        </p>
      )}
    </figure>
  );
}

/** One plate on the route: where it goes and what is there. */
function Way({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="row-btn -mt-0.5 flex flex-col gap-3 border-2 border-ink bg-paper-3 p-6 first:mt-0 md:mt-0 md:-ml-0.5 md:p-8 md:first:ml-0">
      <span className="text-[24px] font-extrabold leading-[1.05] tracking-[-0.03em]">{title}</span>
      <span className="text-[15px] leading-relaxed text-ink-2">{text}</span>
    </button>
  );
}

export default function LandingPage({ risk, ageHours, go }: Props) {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 md:px-10">
      {/* Hero: the promise on the left, today's board on the right. */}
      <section className="grid min-h-[calc(100dvh-3.5rem)] grid-cols-[minmax(0,1fr)] items-center gap-10 py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        <div>
          <h1 className="max-w-[14ch] text-[clamp(2.25rem,3.4vw+0.75rem,4rem)] leading-[0.98] tracking-[-0.04em]">
            Agrim tells Gurugram which hotspots will flood.
          </h1>
          <p className="lead mt-6 max-w-[40ch] text-ink-2">
            Waterlogging forecast for the next 24 to 48 hours, and what MCG crews should do first.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => go("forecast")}>See today's forecast</button>
            <button type="button" className="btn btn--lg" onClick={() => go("simulator")}>Run a storm</button>
          </div>
        </div>
        <Board risk={risk} ageHours={ageHours} />
      </section>

      {/* The three ways in, set as a route: plates joined by a 2px rule. */}
      <section className="grid grid-cols-[minmax(0,1fr)] pt-8 md:grid-cols-3 md:pt-16" aria-label="Ways in">
        <Way title="See today's forecast" text="Red, Amber or Green for every mapped hotspot, the reasons, and roads to avoid. English and हिन्दी." onClick={() => go("forecast")} />
        <Way title="Run a storm" text="Design a storm, replay a past monsoon day, or block a drain and watch which hotspots back up." onClick={() => go("simulator")} />
        <Way title="MCG desk" text="Orders per zone, the T-24 to T+24 checklist, officer overrides, citizen alerts and the scorecard." onClick={() => go("ops")} />
      </section>

      <nav aria-label="More about Agrim" className="mt-16 grid grid-cols-[minmax(0,1fr)] border-t-2 border-ink md:mt-24 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" className={MORE} onClick={() => go("drainage")}>Critical drain points</button>
        <button type="button" className={MORE} onClick={() => go("about", "backtest")}>Backtest on past floods</button>
        <button type="button" className={MORE} onClick={() => go("about", "data")}>Data & assumptions</button>
        <button type="button" className={MORE} onClick={() => go("about", "sources")}>Sources & credits</button>
      </nav>

      <footer className="mt-12 border-t border-rule py-8 md:mt-16">
        <p className="max-w-[72ch] text-[14px] leading-relaxed text-muted">
          21 of MCG's 159 hotspots are mapped, from public reports; the full list needs MCG data. Rain comes from three
          global weather models, judged against each hotspot's own 2018 to 2026 record, plus terrain and drains. Everything
          simulated is marked as an exercise. Gurugram, a SustainX 2026 prototype.
        </p>
      </footer>
    </div>
  );
}
