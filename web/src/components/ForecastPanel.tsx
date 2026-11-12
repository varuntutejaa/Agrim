// Forecast view: what the live forecast means for each hotspot.
import type { RainCollection, RainWindow, RiskResult, RiskWindowKey } from "../types";
import Downstream from "./Downstream";
import ModelStatus from "./ModelStatus";
import RiskLedger from "./RiskLedger";
import RiskSummary from "./RiskSummary";
import RoadsToAvoid from "./RoadsToAvoid";
import { Kicker, Rule, TextTabs } from "./ui";
import { type Lang, locale, t } from "../i18n";

type Props = {
  risk: RiskResult | null;
  riskWindow: RiskWindowKey;
  onRiskWindow: (w: RiskWindowKey) => void;
  rain: RainCollection | null;
  showRain: boolean;
  onShowRain: (v: boolean) => void;
  rainWindow: RainWindow;
  onRainWindow: (w: RainWindow) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang: Lang;
  ageHours: number | null;
};

export default function ForecastPanel(p: Props) {
  const { risk, riskWindow, lang } = p;
  const s = t(lang);
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(locale(lang), { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit", hour12: false });
  const win = risk?.meta.windows[riskWindow];
  const scored = risk?.hotspots.filter((h) => h.scored) ?? [];
  const wettest = Math.max(0, ...scored.map((h) => (h.scored ? h.windows[riskWindow].rain.rain_24h : 0)));
  const sub = risk
    ? `${wettest > 0 ? s.wettest(wettest) : s.noRain} ${s.fetched(fmtDay(risk.meta.forecast_fetched_at), fmtTime(risk.meta.forecast_fetched_at))}`
    : undefined;

  return (
    <div className="space-y-7 px-5 pb-10 pt-5 md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div>
          <Kicker>{s.forecast}</Kicker>
          {win && (
            <div className="mt-0.5 font-mono text-[11.5px] text-ink-2">
              {fmtDay(win.start)} {fmtTime(win.start)} → {fmtDay(win.end)} {fmtTime(win.end)}
            </div>
          )}
        </div>
        <TextTabs
          label="Forecast window"
          options={[{ key: "next_24h" as const, label: s.next24 }, { key: "day_2" as const, label: s.day2 }]}
          value={riskWindow}
          onChange={p.onRiskWindow}
        />
      </div>

      {p.ageHours !== null && p.ageHours > 12 && risk && (
        <div role="status" className="border border-risk-amber bg-paper-2 px-3 py-2 text-[13px] text-ink">
          <span className="kicker mr-1.5 !text-risk-amber">{lang === "hi" ? "पुराना" : "Old forecast"}</span>
          {s.stale(Math.round(p.ageHours), `${fmtDay(risk.meta.generated_at)} ${fmtTime(risk.meta.generated_at)} IST`)}
        </div>
      )}

      <RiskSummary counts={risk?.meta.counts[riskWindow]} sub={sub} lang={lang} />
      <p className="-mt-3 text-[12px] text-ink-3">{s.coverage}</p>

      <RoadsToAvoid windowKey={riskWindow} lang={lang} refreshKey={risk} onSelect={p.onSelect} />

      {risk && <Downstream hotspots={risk.hotspots} windowKey={riskWindow} onSelect={p.onSelect} lang={lang} />}

      <section>
        <Kicker className="mb-2">{s.allHotspots}</Kicker>
        {risk ? (
          <RiskLedger hotspots={risk.hotspots} windowKey={riskWindow} selectedId={p.selectedId} onSelect={p.onSelect} lang={lang} />
        ) : (
          <div className="h-64 animate-pulse bg-paper-2" />
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <Kicker>{s.rainLayer}</Kicker>
          <TextTabs
            label="Rain layer"
            options={[
              { key: "off" as const, label: s.off },
              { key: "next_24h" as const, label: "24 h" },
              { key: "next_48h" as const, label: "48 h" },
              { key: "past_72h" as const, label: s.past72 },
            ]}
            value={p.showRain ? p.rainWindow : "off"}
            onChange={(k) => {
              if (k === "off") p.onShowRain(false);
              else {
                p.onShowRain(true);
                p.onRainWindow(k);
              }
            }}
          />
        </div>
        <p className="mt-1.5 text-[12px] text-ink-3">{s.rainLayerNote}</p>
      </section>

      <ModelStatus />

      <Rule />
      <footer className="space-y-2 text-[12px] leading-relaxed text-ink-3">
        {risk && <p className="text-ink-2">{s.rulesNote ?? risk.meta.note}</p>}
        <p>{s.methodNote}</p>
      </footer>
    </div>
  );
}
