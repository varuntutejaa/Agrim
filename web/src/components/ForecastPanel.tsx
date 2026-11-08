// Forecast view: what the live forecast means for each hotspot.
import type { RainCollection, RainWindow, RiskResult, RiskWindowKey } from "../types";
import Downstream from "./Downstream";
import ModelStatus from "./ModelStatus";
import RiskLedger from "./RiskLedger";
import RiskSummary from "./RiskSummary";
import { Kicker, Rule, TextTabs } from "./ui";

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
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });

export default function ForecastPanel(p: Props) {
  const { risk, riskWindow } = p;
  const win = risk?.meta.windows[riskWindow];
  const scored = risk?.hotspots.filter((h) => h.scored) ?? [];
  const wettest = Math.max(0, ...scored.map((h) => (h.scored ? h.windows[riskWindow].rain.rain_24h : 0)));
  const sub = risk
    ? `${wettest > 0 ? `Wettest hotspot: ${wettest} mm forecast.` : "No rain forecast at any hotspot."} Forecast from ECMWF, GFS and ICON, fetched ${fmtDay(risk.meta.forecast_fetched_at)} at ${fmtTime(risk.meta.forecast_fetched_at)} IST.`
    : undefined;

  return (
    <div className="space-y-7 px-5 pb-10 pt-5 md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div>
          <Kicker>Forecast</Kicker>
          {win && (
            <div className="mt-0.5 font-mono text-[11.5px] text-ink-2">
              {fmtDay(win.start)} {fmtTime(win.start)} → {fmtDay(win.end)} {fmtTime(win.end)}
            </div>
          )}
        </div>
        <TextTabs
          label="Forecast window"
          options={[{ key: "next_24h" as const, label: "Next 24 h" }, { key: "day_2" as const, label: "Day 2" }]}
          value={riskWindow}
          onChange={p.onRiskWindow}
        />
      </div>

      <RiskSummary counts={risk?.meta.counts[riskWindow]} sub={sub} />

      {risk && <Downstream hotspots={risk.hotspots} windowKey={riskWindow} onSelect={p.onSelect} />}

      <section>
        <Kicker className="mb-2">All hotspots, highest risk first</Kicker>
        {risk ? (
          <RiskLedger hotspots={risk.hotspots} windowKey={riskWindow} selectedId={p.selectedId} onSelect={p.onSelect} />
        ) : (
          <div className="h-64 animate-pulse bg-paper-2" />
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <Kicker>Rain layer</Kicker>
          <TextTabs
            label="Rain layer"
            options={[
              { key: "off" as const, label: "Off" },
              { key: "next_24h" as const, label: "24 h" },
              { key: "next_48h" as const, label: "48 h" },
              { key: "past_72h" as const, label: "Past 72 h" },
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
        <p className="mt-1.5 text-[12px] text-ink-3">
          Average of the three forecast models on a ~2 km grid. The models themselves are ~9–25 km across, so
          neighbouring points often match.
        </p>
      </section>

      <ModelStatus />

      <Rule />
      <footer className="space-y-2 text-[12px] leading-relaxed text-ink-3">
        {risk && <p className="text-ink-2">{risk.meta.note}</p>}
        <p>
          Each forecast is compared with ECMWF's 2018–2026 monsoon record at that hotspot, then combined with terrain
          (Copernicus DEM), drains (OpenStreetMap) and built-up land (ESA WorldCover). Method in docs/MODEL.md; sources in
          docs/SOURCES.md.
        </p>
      </footer>
    </div>
  );
}
