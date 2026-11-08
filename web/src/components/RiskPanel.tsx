// Side panel for the risk view: Red/Amber/Green list ranked by risk, with the
// reasons and the recommended action, plus the rain layer controls.
import type { HotspotRisk, RainCollection, RainWindow, RiskResult, RiskWindowKey } from "../types";
import { LEVEL_COLOR, LEVEL_LABEL, confidenceLabel, wetWindowLabel } from "../risk";

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

const RAIN_WINDOWS: { key: RainWindow; label: string }[] = [
  { key: "next_24h", label: "Next 24 h" },
  { key: "next_48h", label: "Next 48 h" },
  { key: "past_72h", label: "Past 72 h" },
];

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const timeLabel = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function Toggle<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="flex gap-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            value === o.key ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function HotspotRow({ h, riskWindow, selected, onSelect }: { h: HotspotRisk; riskWindow: RiskWindowKey; selected: boolean; onSelect: () => void }) {
  if (!h.scored) {
    return (
      <li className="flex items-center gap-2 px-3 py-2 text-slate-500">
        <span className="h-3 w-3 shrink-0 rounded-full border-2 border-dashed border-slate-400" aria-hidden />
        <span className="flex-1">{h.name}</span>
        <span className="rounded bg-slate-100 px-1.5 text-xs">needs a pin</span>
      </li>
    );
  }
  const w = h.windows[riskWindow];
  const active = w.level !== "green";
  const when = wetWindowLabel(w);
  return (
    <li>
      <button onClick={onSelect} className={`w-full px-3 py-2 text-left hover:bg-slate-50 ${selected ? "bg-sky-50" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[w.level] }} aria-hidden />
          <span className="flex-1 font-medium">{h.name}</span>
          <span className="text-xs font-semibold" style={{ color: LEVEL_COLOR[w.level] }}>{LEVEL_LABEL[w.level]}</span>
        </div>
        {active ? (
          <div className="ml-5 mt-1 space-y-0.5 text-xs text-slate-700">
            <div className="text-slate-500">
              {[confidenceLabel(w), when && `wettest ${when}`, `score ${w.score}`].filter(Boolean).join(" · ")}
            </div>
            <div className="font-medium text-slate-900">{w.action}</div>
            <ul className="list-disc pl-4 text-slate-600">
              {w.drivers.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        ) : (
          <div className="ml-5 text-xs text-slate-400">
            {w.rain.rain_24h > 0 ? `${w.rain.rain_24h} mm forecast · ` : ""}Watched because: {w.drivers[0]?.toLowerCase() ?? "listed hotspot"}
          </div>
        )}
        {!h.verified && <div className="ml-5 text-xs text-slate-400">Location not yet checked by the team</div>}
      </button>
    </li>
  );
}

export default function RiskPanel(p: Props) {
  const { risk, riskWindow, rain } = p;
  const counts = risk?.meta.counts[riskWindow];
  const win = risk?.meta.windows[riskWindow];
  const maxRain = Math.max(0, ...(rain?.features ?? []).map((f) => f.properties[p.rainWindow]));
  const scored = risk?.hotspots.filter((h) => h.scored) ?? [];
  const wettest = Math.max(0, ...scored.map((h) => (h.scored ? h.windows[riskWindow].rain.rain_24h : 0)));

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      {/* Summary */}
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Flood risk</h2>
          <Toggle
            options={[
              { key: "next_24h" as const, label: "Next 24 h" },
              { key: "day_2" as const, label: win && riskWindow === "day_2" ? dayLabel(win.start) : "Day 2" },
            ]}
            value={riskWindow}
            onChange={p.onRiskWindow}
          />
        </div>
        {!risk || !counts ? (
          <p className="text-slate-500">Loading forecast…</p>
        ) : counts.red + counts.amber === 0 ? (
          <p>
            <b className="text-green-700">No flooding expected</b> at any mapped hotspot.
            {wettest > 0 ? ` Wettest spot: ${wettest} mm forecast.` : " No rain forecast."}
          </p>
        ) : (
          <p className="flex flex-wrap gap-3">
            <span><b style={{ color: LEVEL_COLOR.red }}>{counts.red}</b> likely</span>
            <span><b style={{ color: LEVEL_COLOR.amber }}>{counts.amber}</b> possible</span>
            <span><b style={{ color: LEVEL_COLOR.green }}>{counts.green}</b> low risk</span>
          </p>
        )}
        {risk && (
          <p className="mt-2 text-xs text-slate-500">
            Forecast fetched {timeLabel(risk.meta.forecast_fetched_at)}. {risk.meta.note}
          </p>
        )}
      </section>

      {/* Ranked list */}
      <section>
        <h2 className="mb-2 font-semibold">Hotspots, highest risk first</h2>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {risk?.hotspots.map((h) => (
            <HotspotRow key={h.id} h={h} riskWindow={riskWindow} selected={p.selectedId === h.id} onSelect={() => p.onSelect(h.id)} />
          ))}
        </ul>
      </section>

      {/* Rain layer */}
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <label className="mb-2 flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={p.showRain} onChange={(e) => p.onShowRain(e.target.checked)} />
          Show rain on the map
        </label>
        {p.showRain && (
          <>
            <Toggle options={RAIN_WINDOWS} value={p.rainWindow} onChange={p.onRainWindow} />
            <p className="mt-2 text-xs text-slate-500">
              {maxRain === 0 ? "No rain in this window anywhere in the city." : `Wettest grid point: ${maxRain.toFixed(1)} mm`} (average
              of the forecast models, ~2 km grid).
            </p>
          </>
        )}
      </section>

      {/* Legend */}
      <section className="text-xs text-slate-600">
        <h2 className="mb-1 font-semibold text-slate-800">What the colours mean</h2>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR.red }} /> Red: flooding likely even if rain is lighter than forecast, high impact</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR.amber }} /> Amber: flooding possible if rain is heavier than forecast</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR.green }} /> Green: low risk</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: LEVEL_COLOR.none }} /> Grey: no location yet, not scored</div>
      </section>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Rain forecast from{" "}
        <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>{" "}
        (ECMWF, NOAA, DWD), compared with ECMWF's 2018–2026 monsoon record at each hotspot. Terrain from Copernicus DEM,
        OpenStreetMap and ESA WorldCover. Hotspot names: team-compiled seed list. How the score works: docs/MODEL.md;
        all sources: docs/SOURCES.md.
      </footer>
    </div>
  );
}
