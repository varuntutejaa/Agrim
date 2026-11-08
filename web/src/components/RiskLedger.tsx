// The ranked list of hotspots, written like a ledger: rank, name, rain,
// status. Selecting a row opens the reasons and the recommended action.
import type { HotspotRisk, RiskWindowKey } from "../types";
import { LEVEL_COLOR, LEVEL_LABEL, confidenceLabel, wetWindowLabel } from "../risk";

type Props = {
  hotspots: HotspotRisk[];
  windowKey: RiskWindowKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function RiskLedger({ hotspots, windowKey, selectedId, onSelect }: Props) {
  let rank = 0;
  return (
    <div>
      <div className="grid grid-cols-[28px_1fr_64px_84px] border-b border-ink pb-1.5">
        <span className="kicker">#</span>
        <span className="kicker">Hotspot</span>
        <span className="kicker text-right">Rain 24h</span>
        <span className="kicker text-right">Status</span>
      </div>
      <ol>
        {hotspots.map((h) => {
          if (!h.scored) {
            return (
              <li key={h.id} className="grid grid-cols-[28px_1fr_84px] items-baseline border-b border-rule py-2.5 text-ink-3">
                <span className="font-mono text-[12px]">–</span>
                <span className="text-[14px]">{h.name}</span>
                <span className="text-right text-[12px]">Needs a pin</span>
              </li>
            );
          }
          rank += 1;
          const w = h.windows[windowKey];
          const open = selectedId === h.id;
          return (
            <li key={h.id} className={`border-b border-rule ${open ? "bg-paper-2" : ""}`}>
              <button
                onClick={() => onSelect(h.id)}
                aria-expanded={open}
                className="grid w-full grid-cols-[28px_1fr_64px_84px] items-baseline py-2.5 text-left hover:bg-paper-2"
              >
                <span className="font-mono tabular text-[12px] text-ink-3">{String(rank).padStart(2, "0")}</span>
                <span className={`text-[14.5px] ${w.level === "green" ? "text-ink-2" : "font-medium text-ink"}`}>{h.name}</span>
                <span className="font-mono tabular text-right text-[13px] text-ink-2">
                  {w.rain.rain_24h.toFixed(0)}
                  <span className="text-ink-3"> mm</span>
                </span>
                <span className="flex items-center justify-end gap-1.5 text-[12px] font-medium" style={{ color: LEVEL_COLOR[w.level] }}>
                  <span className="inline-block h-2 w-2" style={{ background: LEVEL_COLOR[w.level] }} />
                  {LEVEL_LABEL[w.level]}
                </span>
              </button>
              {open && <Details h={h} windowKey={windowKey} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Details({ h, windowKey }: { h: Extract<HotspotRisk, { scored: true }>; windowKey: RiskWindowKey }) {
  const w = h.windows[windowKey];
  const active = w.level !== "green";
  const when = wetWindowLabel(w);
  const facts = [confidenceLabel(w), when && `Wettest ${when}`, `Score ${w.score} / 100`].filter(Boolean);
  return (
    <div className="space-y-2.5 pb-3.5 pl-7 pr-2 text-[13px]">
      {active && (
        <div className="border-l-2 pl-2.5" style={{ borderColor: LEVEL_COLOR[w.level] }}>
          <div className="kicker" style={{ color: LEVEL_COLOR[w.level] }}>Action</div>
          <div className="font-medium text-ink">{w.action}</div>
        </div>
      )}
      <div>
        <div className="kicker">{active ? "Why" : "Why it is watched"}</div>
        <ul className="mt-0.5 space-y-0.5 text-ink-2">
          {w.drivers.slice(0, active ? 3 : 2).map((d) => (
            <li key={d} className="flex gap-2"><span className="text-ink-3">–</span>{d}</li>
          ))}
        </ul>
      </div>
      <div className="font-mono text-[11.5px] text-ink-3">{facts.join("  ·  ")}</div>
      {!h.verified && <div className="text-[12px] text-ink-3">Map pin not yet checked by the team.</div>}
    </div>
  );
}
