// "Roads to avoid": the citizen version of the forecast. Plain words, a time
// window and a tip, in English or Hindi. Shown only when something is at risk.
import { useEffect, useState } from "react";
import { fetchPublicAlerts } from "../api";
import type { CitizenItem, RiskWindowKey } from "../types";
import { LEVEL_COLOR } from "../risk";
import { type Lang, t } from "../i18n";
import { Kicker } from "./ui";

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
    <section className="border-l-2 border-ink pl-3.5">
      <Kicker>{s.avoid}</Kicker>
      <ul className="mt-2 space-y-2.5">
        {items.map((i) => {
          const level = i.level as "red" | "amber";
          return (
            <li key={i.hotspot_id}>
              <button onClick={() => onSelect(i.hotspot_id)} className="text-left">
                <span className="mr-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: LEVEL_COLOR[level] }}>
                  {s.avoidLevel[level]}
                </span>
                <span className="text-[15px] font-medium text-ink hover:underline">{i.name}</span>
                <span className="block text-[13px] text-ink-2">
                  {lang === "hi" ? i.when_hi : i.when_en}. {lang === "hi" ? i.tip_hi : i.tip_en}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11.5px] text-ink-3">{s.avoidNote}</p>
    </section>
  );
}
