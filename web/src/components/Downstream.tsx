// "Risk travels downstream": at-risk hotspots whose water flows on to another one.
import type { HotspotRisk, RiskWindowKey } from "../types";
import { LEVEL_BG, spreadingLinks } from "../risk";
import { type Lang, t } from "../i18n";

export default function Downstream({ hotspots, windowKey, onSelect, lang = "en" }: {
  hotspots: HotspotRisk[];
  windowKey: RiskWindowKey;
  onSelect: (id: string) => void;
  lang?: Lang;
}) {
  const s = t(lang);
  const links = spreadingLinks(hotspots, windowKey);
  if (!links.length) return null;
  return (
    <section>
      <h3 className="h-sub">{s.downstream}</h3>
      <ul className="m-0 mt-3 list-none border-t-2 border-ink p-0 text-[14px]">
        {links.map(({ from, to, level }) => (
          <li key={`${from.id}-${to.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2.5">
            <span className={`inline-block h-2.5 w-2.5 shrink-0 ${LEVEL_BG[level]}`} aria-hidden />
            <button type="button" onClick={() => onSelect(from.id)} className="link whitespace-nowrap font-extrabold no-underline hover:underline">{from.name}</button>
            <span className="font-extrabold text-muted" aria-label="flows to">→</span>
            <button type="button" onClick={() => onSelect(to.id)} className="link whitespace-nowrap text-ink-2 no-underline hover:underline">{to.name}</button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-muted">{s.downstreamNote}</p>
    </section>
  );
}
