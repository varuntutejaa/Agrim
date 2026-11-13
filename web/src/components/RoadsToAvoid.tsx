// "Roads to avoid": the citizen version of the forecast, set as a sign on an ink
// plate. Plain words, a time window and a tip, in English or Hindi. Shown only
// when something is at risk.
import { useEffect, useState } from "react";
import { fetchPublicAlerts } from "../api";
import type { CitizenItem, RiskWindowKey } from "../types";
import { type Lang, t } from "../i18n";

export default function RoadsToAvoid({ windowKey, lang, refreshKey, onSelect }: {
  windowKey: RiskWindowKey;
  lang: Lang;
  refreshKey: unknown;
  onSelect: (id: string) => void;
}) {
  const [items, setItems] = useState<CitizenItem[]>([]);
  useEffect(() => {
    fetchPublicAlerts(windowKey).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [windowKey, refreshKey]);
  if (!items.length) return null;
  const s = t(lang);
  return (
    <section className="plate">
      <h3 className="h-sub border-b border-ink-rule px-4 py-3 text-ink">{s.avoid}</h3>
      <ul className="m-0 list-none p-0">
        {items.map((i) => {
          const level = i.level as "red" | "amber";
          return (
            <li key={i.hotspot_id} className="border-b border-ink-rule last:border-b-0">
              <button type="button" onClick={() => onSelect(i.hotspot_id)} className="w-full px-4 py-3 text-left hover-light">
                <span className="flex items-center gap-3">
                  <span className={`status status--${level}`}>{s.avoidLevel[level]}</span>
                  <span className="text-[16px] font-semibold text-ink">{i.name}</span>
                </span>
                <span className="mt-1.5 block text-[14px] leading-relaxed text-paper-dim">
                  {lang === "hi" ? i.when_hi : i.when_en}. {lang === "hi" ? i.tip_hi : i.tip_en}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-ink-rule px-4 py-2.5 text-[13px] text-paper-dim">{s.avoidNote}</p>
    </section>
  );
}
