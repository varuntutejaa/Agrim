// The headline sentence, the three big counts and the proportion bar.
// Used by both the live forecast and the simulator.
import type { RiskLevel } from "../types";
import { LEVEL_COLOR } from "../risk";
import { type Lang, t } from "../i18n";

type Props = {
  counts: Record<RiskLevel, number> | undefined;
  /** "In this scenario," for the simulator; empty for the live forecast. */
  lead?: string;
  sub?: string;
  lang?: Lang;
};

export default function RiskSummary({ counts, lead = "", sub, lang = "en" }: Props) {
  const s = t(lang);
  if (!counts) {
    return <div className="h-[132px] animate-pulse bg-paper-2" aria-label="Loading" />;
  }
  const total = counts.red + counts.amber + counts.green || 1;
  const cells: { level: RiskLevel; label: string }[] = [
    { level: "red", label: s.countLabel.red },
    { level: "amber", label: s.countLabel.amber },
    { level: "green", label: s.countLabel.green },
  ];
  return (
    <div>
      <h2 className="font-display text-[27px] font-medium leading-[1.15] tracking-[-0.01em] text-ink md:text-[30px]">
        {s.headline(counts, lead)}
      </h2>
      {sub && <p className="mt-2 text-[13px] leading-snug text-ink-2">{sub}</p>}

      <div className="mt-5 grid grid-cols-3 border-t border-ink">
        {cells.map(({ level, label }) => (
          <div key={level} className="border-r border-rule pt-2 pr-3 last:border-r-0 [&:not(:first-child)]:pl-3">
            <div className="kicker flex items-center gap-1.5">
              <span className="inline-block h-2 w-2" style={{ background: LEVEL_COLOR[level] }} />
              {label}
            </div>
            <div
              className="font-mono tabular text-[40px] font-medium leading-none tracking-tight"
              style={{ color: counts[level] && level !== "green" ? LEVEL_COLOR[level] : undefined }}
            >
              {counts[level]}
            </div>
          </div>
        ))}
      </div>

      {/* Share of hotspots at each level */}
      <div className="mt-4 flex h-1.5 gap-px" aria-hidden>
        {cells.map(({ level }) =>
          counts[level] ? (
            <div
              key={level}
              className="transition-[flex-grow] duration-300"
              style={{ flexGrow: counts[level] / total, background: LEVEL_COLOR[level] }}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
