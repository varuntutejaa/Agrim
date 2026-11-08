// "Risk travels downstream": at-risk hotspots whose water flows on to another one.
import type { HotspotRisk, RiskWindowKey } from "../types";
import { LEVEL_COLOR, spreadingLinks } from "../risk";
import { Kicker } from "./ui";

export default function Downstream({ hotspots, windowKey, onSelect }: {
  hotspots: HotspotRisk[];
  windowKey: RiskWindowKey;
  onSelect: (id: string) => void;
}) {
  const links = spreadingLinks(hotspots, windowKey);
  if (!links.length) return null;
  return (
    <section>
      <Kicker>Risk travels downstream</Kicker>
      <ul className="mt-2 space-y-1.5 text-[13.5px]">
        {links.map(({ from, to, level }) => (
          <li key={`${from.id}-${to.id}`} className="flex items-baseline gap-2">
            <button onClick={() => onSelect(from.id)} className="font-medium hover:underline">{from.name}</button>
            <span className="font-mono text-[13px]" style={{ color: LEVEL_COLOR[level] }} aria-label="flows to">→</span>
            <button onClick={() => onSelect(to.id)} className="text-ink-2 hover:underline">{to.name}</button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] text-ink-3">
        Clearing drains at the first hotspot also eases the second.
      </p>
    </section>
  );
}
