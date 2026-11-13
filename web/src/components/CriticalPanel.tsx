// Critical intervention points: which drain outfalls serve the most hotspots,
// and how few of them serve most of the problem (the "20/80" question).
import type { CriticalNodes } from "../types";

export default function CriticalPanel({ critical, selectedHotspot, onSelect }: {
  critical: CriticalNodes | null;
  selectedHotspot: string | null;
  onSelect: (hotspotId: string) => void;
}) {
  if (!critical) return <div className="h-48 bg-paper-2" aria-label="Loading" />;
  const s = critical.summary;
  const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`;
  const at = (k: number) => s.curve[Math.min(k, s.curve.length) - 1];
  const four = at(4);
  return (
    <div className="space-y-9">
      <div>
        <h2 className="h-panel">
          {s.top_label} serves {s.top_serves} of {s.n_hotspots} mapped hotspots. Fix it first.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
          {four.points} outfalls ({pct(four.points, s.n_points)} of them) serve {four.hotspots} hotspots
          ({pct(four.hotspots, s.n_hotspots)}). {s.n_priority} serve {s.priority_covers} ({pct(s.priority_covers, s.n_hotspots)}).
          An outfall serves a hotspot when that hotspot's water passes through it.
        </p>
      </div>

      {/* Coverage curve: points added in priority order vs share of hotspots served */}
      <section>
        <h3 className="h-sub">How concentrated the problem is</h3>
        <ol className="m-0 mt-3 list-none space-y-1.5 border-t border-rule p-0 pt-3" aria-label="Share of mapped hotspots served by the best outfalls">
          {s.curve.map((c) => (
            <li key={c.points} className="grid grid-cols-[76px_minmax(0,1fr)_48px] items-center gap-2 text-[13px]">
              <span className="text-muted">{c.points} point{c.points > 1 ? "s" : ""}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-paper-3">
                <span className={`block h-full rounded-full ${c.points <= s.n_priority ? "bg-water" : "bg-muted"}`} style={{ width: pct(c.hotspots, s.n_hotspots) }} />
              </span>
              <span className="text-right font-semibold">{pct(c.hotspots, s.n_hotspots)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[13px] text-muted">Share of mapped hotspots served, adding the best point each time. Blue: the priority set (≥ 80%).</p>
      </section>

      <section>
        <h3 className="h-sub">Outfalls, by hotspots served</h3>
        <div className="mt-3 grid grid-cols-[36px_minmax(0,1fr)_48px] gap-x-1 border-b border-rule pb-2" role="presentation">
          <span className="label">#</span>
          <span className="label">Outfall</span>
          <span className="label text-right">Serves</span>
        </div>
        <ol className="m-0 list-none p-0">
          {critical.features.map(({ properties: p }) => (
            <li key={p.id} className={`border-b border-rule ${selectedHotspot === p.hotspot_id ? "bg-paper-2" : ""}`}>
              <button type="button" onClick={() => onSelect(p.hotspot_id)} className="row-btn grid grid-cols-[36px_minmax(0,1fr)_48px] items-baseline gap-x-1 py-3">
                <span className="text-[13px] text-muted">{p.priority_order ? `#${p.priority_order}` : ""}</span>
                <span>
                  <span className="text-[15px] font-semibold">{p.label}</span>
                  {p.upstream_names.length > 0 && (
                    <span className="mt-0.5 block text-[13px] text-ink-2">also relieves {p.upstream_names.join(", ")}</span>
                  )}
                </span>
                <span className="text-right text-[20px] font-display font-medium leading-none">{p.n_hotspots}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          # is the order in the priority set. Hotspots count equally. {s.cost_note} With MCG's full list of 159, the
          concentration will show more clearly.
        </p>
      </section>
    </div>
  );
}
