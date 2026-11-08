// Side panel: rain summary, layer toggle, hotspot list, legend and sources.
import type { HotspotCollection, RainCollection, RainWindow } from "../types";

type Props = {
  hotspots: HotspotCollection | null;
  rain: RainCollection | null;
  rainWindow: RainWindow;
  onRainWindow: (w: RainWindow) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const WINDOWS: { key: RainWindow; label: string }[] = [
  { key: "next_24h", label: "Next 24 h" },
  { key: "next_48h", label: "Next 48 h" },
  { key: "past_72h", label: "Past 72 h" },
];

const MODEL_NAMES: Record<string, string> = {
  ecmwf_ifs: "ECMWF IFS",
  gfs_seamless: "NOAA GFS",
  icon_seamless: "DWD ICON",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function HotspotPanel({ hotspots, rain, rainWindow, onRainWindow, selectedId, onSelect }: Props) {
  const located = hotspots?.features ?? [];
  const unlocated = hotspots?.unlocated ?? [];
  const checked = located.filter((f) => f.properties.verified).length;
  const maxRain = Math.max(0, ...(rain?.features ?? []).map((f) => f.properties[rainWindow]));
  const windowLabel = WINDOWS.find((w) => w.key === rainWindow)!.label.toLowerCase();

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      {/* Rain summary */}
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <h2 className="mb-2 font-semibold">Rainfall</h2>
        <div className="mb-2 flex gap-1" role="tablist" aria-label="Rain time window">
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              role="tab"
              aria-selected={rainWindow === w.key}
              onClick={() => onRainWindow(w.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                rainWindow === w.key ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        {rain?.meta ? (
          <>
            <p>
              {maxRain === 0 ? (
                <>No rain in the {windowLabel} anywhere in the city.</>
              ) : (
                <>
                  Wettest spot, {windowLabel}: <b>{maxRain.toFixed(1)} mm</b>
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Average of {rain.meta.models.map((m) => MODEL_NAMES[m] ?? m).join(", ")} forecasts, on a ~2 km grid.
              Fetched {formatTime(rain.meta.fetched_at)}
              {rain.meta.age_hours > 12 && <b className="text-amber-700"> ({rain.meta.age_hours} h old)</b>}.
            </p>
          </>
        ) : (
          <p className="text-slate-500">No forecast yet. Run python -m pipeline.fetch_rain_forecast.</p>
        )}
      </section>

      {/* Hotspot list */}
      <section>
        <h2 className="mb-1 font-semibold">Waterlogging hotspots</h2>
        <p className="mb-2 text-xs text-slate-500">
          {located.length + unlocated.length} hotspots · {located.length} on the map · {checked} locations checked
        </p>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {located.map((f) => {
            const p = f.properties;
            return (
              <li key={p.id}>
                <button
                  onClick={() => onSelect(p.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 ${
                    selectedId === p.id ? "bg-sky-50" : ""
                  }`}
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full border-2 border-blue-900 ${p.verified ? "bg-blue-900" : "bg-white"}`}
                    aria-hidden
                  />
                  <span className="flex-1">{p.name}</span>
                  {p.geocode_status === "name_mismatch" && (
                    <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">check pin</span>
                  )}
                  <span className="text-xs text-slate-400">{p.id}</span>
                </button>
              </li>
            );
          })}
          {unlocated.map((h) => (
            <li key={h.id} className="flex items-center gap-2 px-3 py-2 text-slate-500">
              <span className="h-3 w-3 shrink-0 rounded-full border-2 border-dashed border-slate-400" aria-hidden />
              <span className="flex-1">{h.name}</span>
              <span className="rounded bg-slate-100 px-1.5 text-xs">needs a pin</span>
              <span className="text-xs text-slate-400">{h.id}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Legend */}
      <section className="text-xs text-slate-600">
        <h2 className="mb-1 font-semibold text-slate-800">Legend</h2>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-blue-900 bg-blue-900" /> Hotspot, location checked
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-blue-900 bg-white" /> Hotspot, location from
          OpenStreetMap search, not yet checked
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-3 w-24 rounded" style={{ background: "linear-gradient(90deg,#e0f2fe,#7dd3fc,#0284c7,#1e3a8a)" }} />
          Rain 0 → 50+ mm
        </div>
        <p className="mt-2">Flood risk colours (red / amber / green) arrive in milestone 3.</p>
      </section>

      {/* Sources */}
      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Sources: rainfall from{" "}
        <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        (ECMWF, NOAA, DWD models). Hotspot names: team-compiled seed list; locations from{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
        . Basemap ©{" "}
        <a className="underline" href="https://openfreemap.org" target="_blank" rel="noreferrer">
          OpenFreeMap
        </a>
        , OpenMapTiles, OpenStreetMap contributors. Full list in docs/SOURCES.md.
      </footer>
    </div>
  );
}
