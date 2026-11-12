// The ranked list of hotspots, written like a ledger: rank, name, rain,
// status. Selecting a row opens the reasons and the recommended action.
import type { HotspotRisk, RiskWindowKey } from "../types";
import { LEVEL_COLOR } from "../risk";
import { type Lang, actionText, locale, reasons, t } from "../i18n";
import ModelDots from "./ModelDots";

type Props = {
  hotspots: HotspotRisk[];
  windowKey: RiskWindowKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang?: Lang;
};

export default function RiskLedger({ hotspots, windowKey, selectedId, onSelect, lang = "en" }: Props) {
  const s = t(lang);
  let rank = 0;
  return (
    <div>
      <div className="grid grid-cols-[28px_1fr_64px_84px] border-b border-ink pb-1.5">
        <span className="kicker">#</span>
        <span className="kicker">{s.col.hotspot}</span>
        <span className="kicker text-right">{s.col.rain}</span>
        <span className="kicker text-right">{s.col.status}</span>
      </div>
      <ol>
        {hotspots.map((h) => {
          if (!h.scored) {
            return (
              <li key={h.id} className="grid grid-cols-[28px_1fr_84px] items-baseline border-b border-rule py-2.5 text-ink-3">
                <span className="font-mono text-[12px]">–</span>
                <span className="text-[14px]">{h.name}</span>
                <span className="text-right text-[12px]">{s.needsPin}</span>
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
                  <span className="text-ink-3"> {s.mm}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: LEVEL_COLOR[w.level] }}>
                    <span className="inline-block h-2 w-2" style={{ background: LEVEL_COLOR[w.level] }} />
                    {s.level[w.level]}
                  </span>
                  <ModelDots models={w.models} lang={lang} />
                </span>
              </button>
              {open && <Details h={h} windowKey={windowKey} lang={lang} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Details({ h, windowKey, lang }: { h: Extract<HotspotRisk, { scored: true }>; windowKey: RiskWindowKey; lang: Lang }) {
  const s = t(lang);
  const w = h.windows[windowKey];
  const active = w.level !== "green";
  const ww = w.rain.wet_window;
  const when = ww
    ? `${new Date(ww.start).toLocaleTimeString(locale(lang), { hour: "numeric", hour12: true })} – ${new Date(ww.end).toLocaleTimeString(locale(lang), { hour: "numeric", hour12: true })}`
    : null;
  const facts = [w.confidence && s.confidence[w.confidence], when && `${s.wettestAt} ${when}`, `${s.score} ${w.score} / 100`].filter(Boolean);
  return (
    <div className="space-y-2.5 pb-3.5 pl-7 pr-2 text-[13px]">
      {w.override && (
        <div className="text-[12.5px] text-ink-2">
          <span className="kicker mr-1.5">{s.adjusted}</span>
          {s.adjustedText(w.override.officer, w.model_level ? s.level[w.model_level] : "?")}: "{w.override.reason}"
        </div>
      )}
      {w.models && <ModelDots models={w.models} lang={lang} withText />}
      {active && (
        <div className="border-l-2 pl-2.5" style={{ borderColor: LEVEL_COLOR[w.level] }}>
          <div className="kicker" style={{ color: LEVEL_COLOR[w.level] }}>{s.action}</div>
          <div className="font-medium text-ink">{actionText(w, lang)}</div>
        </div>
      )}
      <div>
        <div className="kicker">{active ? s.why : s.whyWatched}</div>
        <ul className="mt-0.5 space-y-0.5 text-ink-2">
          {reasons(w, lang).slice(0, active ? 3 : 2).map((d) => (
            <li key={d} className="flex gap-2"><span className="text-ink-3">–</span>{d}</li>
          ))}
        </ul>
      </div>
      {w.ml && (
        <div>
          <div className="kicker">{s.modelEstimate}</div>
          <div className="text-ink-2">
            <span className="font-mono text-ink">{Math.round(w.ml.probability * 100)}%</span> {s.chance}
            {w.ml.drivers.length > 0 && <> · {w.ml.drivers.map((d) => d.text).join("; ")}</>}
          </div>
        </div>
      )}
      <div className="font-mono text-[11.5px] text-ink-3">{facts.join("  ·  ")}</div>
      {!h.verified && <div className="text-[12px] text-ink-3">{s.pinUnchecked}</div>}
    </div>
  );
}
