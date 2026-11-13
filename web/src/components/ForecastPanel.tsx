// Forecast view: what the live forecast means for each hotspot.
import type { RainCollection, RainWindow, RiskResult, RiskWindowKey } from "../types";
import Downstream from "./Downstream";
import ModelStatus from "./ModelStatus";
import RiskLedger from "./RiskLedger";
import RiskSummary from "./RiskSummary";
import RoadsToAvoid from "./RoadsToAvoid";
import { Rule, TextTabs } from "./ui";
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
    <div className="space-y-8 px-4 pb-12 pt-4 md:px-6 md:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <TextTabs
          label="Forecast window"
          options={[{ key: "next_24h" as const, label: s.next24 }, { key: "day_2" as const, label: s.day2 }]}
          value={riskWindow}
          onChange={p.onRiskWindow}
        />
        {win && (
          <span className="text-[13px] text-muted">
            {fmtDay(win.start)} {fmtTime(win.start)} {lang === "hi" ? "से" : "to"} {fmtDay(win.end)} {fmtTime(win.end)}
          </span>
        )}
      </div>

      {p.ageHours !== null && p.ageHours > 12 && risk && (
        <div role="status" className="border-2 border-ink bg-accent-2 px-3 py-2.5 text-[14px] text-ink">
          <span className="mr-1.5 font-extrabold">{lang === "hi" ? "पुराना पूर्वानुमान." : "Old forecast."}</span>
          {s.stale(Math.round(p.ageHours), `${fmtDay(risk.meta.generated_at)} ${fmtTime(risk.meta.generated_at)} IST`)}
        </div>
      )}

      <div>
        <RiskSummary counts={risk?.meta.counts[riskWindow]} sub={sub} lang={lang} />
        <p className="mt-3 text-[13px] leading-relaxed text-muted">{s.coverage}</p>
      </div>

      <RoadsToAvoid windowKey={riskWindow} lang={lang} refreshKey={risk} onSelect={p.onSelect} />

      {risk && <Downstream hotspots={risk.hotspots} windowKey={riskWindow} onSelect={p.onSelect} lang={lang} />}

      <section>
        <h3 className="h-sub mb-3">{s.allHotspots}</h3>
        {risk ? (
          <RiskLedger hotspots={risk.hotspots} windowKey={riskWindow} selectedId={p.selectedId} onSelect={p.onSelect} lang={lang} />
        ) : (
          <div className="h-64 bg-paper-2" aria-label="Loading" />
        )}
      </section>

      <section>
        <h3 className="h-sub">{s.rainLayer}</h3>
        <div className="mt-3">
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
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.rainLayerNote}</p>
      </section>

      <ModelStatus />

      <Rule strong />
      <footer className="space-y-2 text-[13px] leading-relaxed text-muted">
        {risk && <p className="text-ink-2">{s.rulesNote ?? risk.meta.note}</p>}
        <p>{s.methodNote}</p>
      </footer>
    </div>
  );
}
