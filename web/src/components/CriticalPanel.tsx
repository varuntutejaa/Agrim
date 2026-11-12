// Critical intervention points: which drain outfalls serve the most hotspots,
// and how few of them serve most of the problem (the "20/80" question).
import type { CriticalNodes } from "../types";
import { Kicker } from "./ui";

export default function CriticalPanel({ critical, selectedHotspot, onSelect }: {
  critical: CriticalNodes | null;
  selectedHotspot: string | null;
  onSelect: (hotspotId: string) => void;
}) {
  if (!critical) return <div className="h-48 animate-pulse bg-paper-2" />;
  const s = critical.summary;
  const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`;
  const at = (k: number) => s.curve[Math.min(k, s.curve.length) - 1];
  const four = at(4);
  return (
    <div className="space-y-7">
      <div>
        <h2 className="font-display text-[27px] font-medium leading-[1.15] tracking-[-0.01em] md:text-[30px]">
          {s.top_label} serves {s.top_serves} of {s.n_hotspots} mapped hotspots. Fix it first.
        </h2>
        <p className="mt-2 text-[13px] leading-snug text-ink-2">
          {four.points} outfalls ({pct(four.points, s.n_points)} of them) serve {four.hotspots} hotspots
          ({pct(four.hotspots, s.n_hotspots)}). {s.n_priority} serve {s.priority_covers} ({pct(s.priority_covers, s.n_hotspots)}).
          An outfall serves a hotspot when that hotspot's water passes through it.
        </p>
      </div>

      {/* Coverage curve: points added in priority order vs share of hotspots served */}
      <section>
        <Kicker className="mb-2">How concentrated the problem is</Kicker>
        <div className="space-y-1">
          {s.curve.map((c) => (
            <div key={c.points} className="grid grid-cols-[72px_1fr_44px] items-center gap-2 text-[11.5px]">
              <span className="font-mono text-ink-3">{c.points} point{c.points > 1 ? "s" : ""}</span>
              <span className="h-2.5 bg-paper-3">
                <span className={`block h-full ${c.points <= s.n_priority ? "bg-water" : "bg-ink-3"}`} style={{ width: pct(c.hotspots, s.n_hotspots) }} />
              </span>
              <span className="font-mono tabular text-right">{pct(c.hotspots, s.n_hotspots)}</span>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-3">Share of mapped hotspots served, adding the best point each time. Blue: the priority set (≥ 80%).</p>
      </section>

      <section>
        <Kicker className="mb-2">Outfalls, by hotspots served</Kicker>
        <ol>
          {critical.features.map(({ properties: p }) => (
            <li key={p.id} className={`border-b border-rule ${selectedHotspot === p.hotspot_id ? "bg-paper-2" : ""}`}>
              <button onClick={() => onSelect(p.hotspot_id)} className="grid w-full grid-cols-[32px_1fr_48px] items-baseline gap-x-1 py-2.5 text-left hover:bg-paper-2">
                <span className="font-mono text-[12px] text-ink-3">{p.priority_order ? `#${p.priority_order}` : "–"}</span>
                <span>
                  <span className="text-[14px] font-medium">{p.label}</span>
                  {p.upstream_names.length > 0 && (
                    <span className="block text-[12px] text-ink-2">also relieves {p.upstream_names.join(", ")}</span>
                  )}
                </span>
                <span className="text-right font-mono text-[18px] leading-none">{p.n_hotspots}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11.5px] text-ink-3">
          # = order in the priority set. Hotspots count equally. {s.cost_note} With MCG's full list of 159, the
          concentration will show more clearly.
        </p>
      </section>
    </div>
  );
}
