// The headline sentence and the three counts, set as signs: a figure in 800 in
// a bordered cell, filled red or amber when something is at risk.
// Used by both the live forecast and the simulator.
import type { RiskLevel } from "../types";
import { LEVEL_BG } from "../risk";
import { type Lang, t } from "../i18n";

type Props = {
  counts: Record<RiskLevel, number> | undefined;
  /** "In this scenario," for the simulator; empty for the live forecast. */
  lead?: string;
  sub?: string;
  lang?: Lang;
};

const FILL: Record<RiskLevel, string> = {
  red: "bg-risk-red text-accent-ink",
  amber: "bg-accent-2 text-ink",
  green: "bg-paper-3 text-ink",
};

export default function RiskSummary({ counts, lead = "", sub, lang = "en" }: Props) {
  const s = t(lang);
  if (!counts) {
    return <div className="h-[164px] bg-paper-2" aria-label="Loading" />;
  }
  const total = counts.red + counts.amber + counts.green || 1;
  const levels: RiskLevel[] = ["red", "amber", "green"];
  return (
    <div>
      <h2 className="h-panel text-ink">{s.headline(counts, lead)}</h2>
      {sub && <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{sub}</p>}

      <dl className="m-0 mt-5 grid grid-cols-3 border-2 border-ink">
        {levels.map((level) => {
          const on = counts[level] > 0 && level !== "green";
          return (
            <div key={level} className={`border-l-2 border-ink px-5 pb-3.5 pt-2.5 first:border-l-0 ${on ? FILL[level] : FILL.green}`}>
              <dt className={`flex min-h-[2.8em] items-start gap-1.5 text-[13px] font-medium leading-snug ${on ? "" : "text-ink-2"}`}>
                <span className={`mt-[0.35em] inline-block h-2 w-2 shrink-0 ${on && level === "red" ? "bg-accent-ink" : LEVEL_BG[level]}`} aria-hidden />
                {s.countLabel[level]}
              </dt>
              <dd className="m-0 mt-2 text-[36px] font-extrabold leading-none tracking-[-0.04em]">{counts[level]}</dd>
            </div>
          );
        })}
      </dl>

      {/* Share of hotspots at each level */}
      <div className="mt-3 flex h-1.5 gap-0.5" aria-hidden>
        {levels.map((level) =>
          counts[level] ? <div key={level} className={LEVEL_BG[level]} style={{ flexGrow: counts[level] / total }} /> : null,
        )}
      </div>
    </div>
  );
}
