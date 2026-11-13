// Drainage view: how water moves between hotspots, and which ones are
// "critical intervention points" (outfalls ranked by how many hotspots drain through them).
import type { CriticalNodes, DrainageLayers, SensorKind } from "../types";
import { plural } from "../risk";
import CriticalPanel from "./CriticalPanel";
import { Rule, TextTabs } from "./ui";

export type DrainageMode = "links" | "critical";

type Props = {
  drainage: DrainageLayers | null;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  mode: DrainageMode;
  onMode: (m: DrainageMode) => void;
  critical: CriticalNodes | null;
  showSensors: boolean;
  onShowSensors: (v: boolean) => void;
  sensorCounts: Record<SensorKind, number> | null;
};

export default function DrainagePanel(p: Props) {
  return (
    <div className="space-y-8 px-4 pb-12 pt-4 md:px-6 md:pt-5">
      <TextTabs label="Drainage view" value={p.mode} onChange={p.onMode}
        options={[{ key: "links" as const, label: "Hotspot links" }, { key: "critical" as const, label: "Critical points" }]} />
      {p.mode === "critical"
        ? <CriticalPanel critical={p.critical} selectedHotspot={p.selectedId} onSelect={p.onSelect} />
        : <LinksView drainage={p.drainage} loading={p.loading} selectedId={p.selectedId} onSelect={p.onSelect} />}

      <section className="border-t-2 border-ink pt-4">
        <label className="flex cursor-pointer items-center gap-3 text-[15px] font-extrabold">
          <input type="checkbox" className="check" checked={p.showSensors} onChange={(e) => p.onShowSensors(e.target.checked)} />
          Show proposed sensors
        </label>
        {p.showSensors && (
          <div className="mt-3 text-[14px] leading-relaxed text-ink-2">
            <span className="mr-2 inline-block bg-accent-2 px-1.5 py-0.5 text-[13px] font-extrabold leading-tight text-ink">Proposed, illustrative</span>
            {p.sensorCounts
              ? `${p.sensorCounts.rain_gauge} rain gauges, ${p.sensorCounts.drain_sensor} drain-level sensors, ${p.sensorCounts.underpass_monitor} underpass monitors.`
              : "Loading…"} Not installed: where new sensors would do the most good. Gauges cover each hotspot's catchment;
            drain sensors sit at outfalls and along flow paths; monitors go in the mapped underpasses nearest hotspots.
          </div>
        )}
      </section>
    </div>
  );
}

function LinksView({ drainage, loading, selectedId, onSelect }: {
  drainage: DrainageLayers | null; loading: boolean; selectedId: string | null; onSelect: (id: string) => void;
}) {
  if (!drainage) {
    return <p className="text-[14px] text-muted">{loading ? "Loading the drainage network…" : "Drainage network not available."}</p>;
  }
  const { meta, nodes } = drainage.network;
  const names = Object.fromEntries(nodes.features.map((f) => [f.properties.id, f.properties.name]));
  const list = (ids: string[]) => ids.map((i) => names[i] ?? i).join(", ");
  const exitsNorth = meta.terminal_exit_sides.north ?? 0;
  const ends = Object.values(meta.terminal_exit_sides).reduce((a, b) => a + b, 0);
  const hub = [...nodes.features].sort((a, b) => b.properties.n_upstream - a.properties.n_upstream)[0]?.properties;

  return (
    <div className="space-y-9">
      <div>
        <h2 className="h-panel">
          {exitsNorth === ends ? "All water leaves the city northward, toward the Najafgarh drain." : `${exitsNorth} of ${ends} flow paths leave the city northward.`}
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
          {plural(meta.n_edges, "link")} between {meta.n_hotspots} mapped hotspots, worked out from ground height and mapped
          drains.{hub && hub.n_upstream > 1 ? ` ${hub.name} collects water from ${hub.n_upstream} other hotspots.` : ""}
        </p>
      </div>

      <section>
        <h3 className="h-sub">Hotspots and where their water goes</h3>
        <p className="mt-2 text-[13px] text-muted">
          Which hotspot flows into which. For where to intervene first, see Critical points.
        </p>
        <div className="mt-3 grid grid-cols-[28px_minmax(0,1fr)_72px] gap-x-2 border-b-2 border-ink pb-2" role="presentation">
          <span className="label">#</span>
          <span className="label">Hotspot</span>
          <span className="label text-right">Drains</span>
        </div>
        <ol className="m-0 list-none p-0">
          {nodes.features.map(({ properties: p }) => (
            <li key={p.id} className={`border-b border-rule ${selectedId === p.id ? "bg-paper-2" : ""}`}>
              <button type="button" onClick={() => onSelect(p.id)} className="row-btn grid grid-cols-[28px_minmax(0,1fr)_72px] items-baseline gap-x-2 py-3">
                <span className="text-[13px] text-muted">{String(p.critical_rank).padStart(2, "0")}</span>
                <span>
                  <span className="text-[15px] font-extrabold">{p.name}</span>
                  <span className="mt-1 block space-y-0.5 text-[13px] text-ink-2">
                    {p.n_downstream > 0 && <span className="block">Flows on to {list(p.downstream)}</span>}
                    {p.n_upstream > 0 && <span className="block">Receives water from {list(p.upstream)}</span>}
                    {!p.on_flow_line && <span className="block text-muted">Off the main flow lines: local runoff</span>}
                    {p.catchment_truncated && <span className="block font-medium text-ink">Catchment runs past the map edge</span>}
                  </span>
                </span>
                <span className="whitespace-nowrap text-right text-[15px] font-extrabold">
                  {p.max_drained_km2_150m.toFixed(p.max_drained_km2_150m < 1 ? 2 : p.max_drained_km2_150m < 100 ? 1 : 0)}
                  {"\u00a0"}<span className="text-[13px] font-medium text-muted">km²</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <Rule strong />
      <footer className="space-y-2 text-[13px] leading-relaxed text-muted">
        <p className="text-ink-2">{meta.caveat}</p>
        <p>
          Ground height: Copernicus DEM GLO-30 (© DLR / Airbus). Drains: OpenStreetMap contributors. Built-up land: ESA
          WorldCover 2021. Method and limits in docs/NETWORK.md.
        </p>
      </footer>
    </div>
  );
}
