// Side panel for the drainage view: how water moves between hotspots, and
// which hotspots are "critical intervention nodes" (most hotspots downstream).
import type { DrainageLayers } from "../types";

type Props = {
  drainage: DrainageLayers | null;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function DrainagePanel({ drainage, loading, selectedId, onSelect }: Props) {
  if (!drainage) {
    return <p className="p-4 text-sm text-slate-500">{loading ? "Loading drainage network…" : "Drainage network not available."}</p>;
  }
  const { meta, nodes } = drainage.network;
  const names = Object.fromEntries(nodes.features.map((f) => [f.properties.id, f.properties.name]));
  const list = (ids: string[]) => ids.map((i) => names[i] ?? i).join(", ");
  const exits = Object.entries(meta.terminal_exit_sides)
    .map(([side, n]) => `${n} ${side === "sink" ? "end in a low spot" : `leave the city to the ${side}`}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <h2 className="mb-1 font-semibold">How water moves</h2>
        <p>
          {meta.n_edges} links between {meta.n_hotspots} mapped hotspots. After the last hotspot on each path, the water
          flows on: {exits}. North is toward the Najafgarh drain.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Worked out from ground height and mapped drains. {meta.caveat}
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Critical intervention points</h2>
        <p className="mb-2 text-xs text-slate-500">
          Ranked by how many other hotspots sit downstream: clearing drains here helps those too.
        </p>
        <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {nodes.features.map(({ properties: p }) => (
            <li key={p.id}>
              <button
                onClick={() => onSelect(p.id)}
                className={`w-full px-3 py-2 text-left hover:bg-slate-50 ${selectedId === p.id ? "bg-indigo-50" : ""}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="w-6 shrink-0 text-xs font-semibold text-slate-400">#{p.critical_rank}</span>
                  <span className="flex-1 font-medium">{p.name}</span>
                  <span className="text-xs text-slate-400">{p.max_drained_km2_150m} km²</span>
                </div>
                <div className="ml-8 text-xs text-slate-600">
                  {p.n_downstream > 0 && <div>Flows on to: {list(p.downstream)}</div>}
                  {p.n_upstream > 0 && <div>Receives water from {p.n_upstream}: {list(p.upstream)}</div>}
                  {p.n_downstream === 0 && p.n_upstream === 0 && <div className="text-slate-400">Not linked to other mapped hotspots</div>}
                  {!p.on_flow_line && <div className="text-amber-700">No flow line within 150 m (local runoff only)</div>}
                  {p.catchment_truncated && <div className="text-amber-700">Catchment runs past the map edge</div>}
                </div>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="text-xs text-slate-600">
        <h2 className="mb-1 font-semibold text-slate-800">Legend</h2>
        <div className="flex items-center gap-2"><span className="h-0.5 w-6 bg-slate-700" /> Flow path between hotspots (arrow = direction)</div>
        <div className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-slate-500" /> Where water goes after the last hotspot</div>
        <div className="flex items-center gap-2"><span className="h-1 w-6 rounded bg-blue-400" /> Flow lines from ground height (wider = more area drains here)</div>
        <div className="flex items-center gap-2"><span className="h-0.5 w-6 bg-teal-700" /> Drain from OpenStreetMap (dashed = covered)</div>
        <div className="flex items-center gap-2"><span className="h-3 w-6 rounded-sm border-2 border-indigo-600 bg-indigo-200" /> Area that drains to the selected hotspot</div>
      </section>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Sources: ground height from Copernicus DEM GLO-30 (© DLR / Airbus); drains from OpenStreetMap; built-up area from
        ESA WorldCover 2021. Built {new Date(meta.built_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}. Full
        list in docs/SOURCES.md.
      </footer>
    </div>
  );
}
