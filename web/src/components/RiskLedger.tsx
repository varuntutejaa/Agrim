// The hotspot board: every junction as a row, like a departure board. Rank,
// name, rain and a status plate. Selecting a row opens the reasons and the action.
import type { HotspotRisk, RiskWindowKey } from "../types";
import { type Lang, actionText, locale, reasons, t } from "../i18n";
import ModelDots from "./ModelDots";

type Props = {
  hotspots: HotspotRisk[];
  windowKey: RiskWindowKey;
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang?: Lang;
};

const COLS = "grid grid-cols-[28px_minmax(0,1fr)_72px_92px] gap-x-2";

export default function RiskLedger({ hotspots, windowKey, selectedId, onSelect, lang = "en" }: Props) {
  const s = t(lang);
  let rank = 0;
  return (
    <div>
      <div className={`${COLS} border-b-2 border-ink pb-2`} role="presentation">
        <span className="label">#</span>
        <span className="label">{s.col.hotspot}</span>
        <span className="label text-right">{s.col.rain}</span>
        <span className="label text-right">{s.col.status}</span>
      </div>
      <ol className="m-0 list-none p-0">
        {hotspots.map((h) => {
          if (!h.scored) {
            return (
              <li key={h.id} className={`${COLS} items-baseline border-b border-rule py-3 text-muted`}>
                <span />
                <span className="text-[15px]">{h.name}</span>
                <span className="col-span-2 text-right text-[13px]">{s.needsPin}</span>
              </li>
            );
          }
          rank += 1;
          const w = h.windows[windowKey];
          const open = selectedId === h.id;
          const atRisk = w.level !== "green";
          return (
            <li key={h.id} className={`border-b border-rule ${open ? "bg-paper-2" : ""}`}>
              <button
                type="button"
                onClick={() => onSelect(h.id)}
                aria-expanded={open}
                className={`row-btn ${COLS} items-center py-3`}
              >
                <span className="text-[13px] text-muted">{String(rank).padStart(2, "0")}</span>
                <span className={`min-w-0 text-[15px] leading-snug ${atRisk ? "font-extrabold text-ink" : "font-medium text-ink-2"}`}>{h.name}</span>
                <span className="whitespace-nowrap text-right text-[16px] font-extrabold text-ink">
                  {w.rain.rain_24h.toFixed(0)}
                  {"\u00a0"}<span className="text-[13px] font-medium text-muted">{s.mm}</span>
                </span>
                <span className="flex flex-col items-end gap-1.5">
                  <span className={`status status--${w.level}`}>{s.level[w.level]}</span>
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
  const hour = (iso: string) => new Date(iso).toLocaleTimeString(locale(lang), { hour: "numeric", hour12: true });
  const when = ww ? `${hour(ww.start)} ${lang === "hi" ? "से" : "to"} ${hour(ww.end)}` : null;
  const facts: [string, string][] = [
    ...(w.confidence ? [[lang === "hi" ? "भरोसा" : "Confidence", s.confidence[w.confidence]] as [string, string]] : []),
    ...(when ? [[s.wettestAt, when] as [string, string]] : []),
    [s.score, `${w.score} / 100`],
  ];
  return (
    <div className="space-y-4 px-2 pb-5 pl-[36px] pt-1 text-[14px]">
      {w.override && (
        <p className="text-[14px] text-ink-2">
          <span className="font-extrabold text-ink">{s.adjusted}. </span>
          {s.adjustedText(w.override.officer, w.model_level ? s.level[w.model_level] : "?")}: “{w.override.reason}”
        </p>
      )}
      {w.models && <ModelDots models={w.models} lang={lang} withText />}
      {active && (
        <div className="border-2 border-ink bg-paper-3 px-3 py-2.5">
          <div className="label">{s.action}</div>
          <div className="mt-1 font-extrabold leading-snug text-ink">{actionText(w, lang)}</div>
        </div>
      )}
      <div>
        <div className="label">{active ? s.why : s.whyWatched}</div>
        <ul className="m-0 mt-1 list-none space-y-1 p-0 text-ink-2">
          {reasons(w, lang).slice(0, active ? 3 : 2).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
      {w.ml && (
        <div>
          <div className="label">{s.modelEstimate}</div>
          <p className="mt-1 text-ink-2">
            <span className="font-extrabold text-ink">{Math.round(w.ml.probability * 100)}%</span> {s.chance}
            {w.ml.drivers.length > 0 && <>. {w.ml.drivers.map((d) => d.text).join("; ")}</>}
          </p>
        </div>
      )}
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[13px]">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="m-0 text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {!h.verified && <p className="text-[13px] text-muted">{s.pinUnchecked}</p>}
    </div>
  );
}
