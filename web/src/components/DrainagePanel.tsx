// Drainage view: how water moves between hotspots, and which ones are
// "critical intervention points" (most hotspots downstream).
import type { DrainageLayers } from "../types";
import { plural } from "../risk";
import { Kicker, Rule } from "./ui";

type Props = {
  drainage: DrainageLayers | null;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function DrainagePanel({ drainage, loading, selectedId, onSelect }: Props) {
  if (!drainage) {
    return (
      <div className="px-5 pt-5 md:px-7">
        <Kicker>Drainage</Kicker>
        <p className="mt-3 text-[14px] text-ink-3">{loading ? "Loading the drainage network…" : "Drainage network not available."}</p>
      </div>
    );
  }
  const { meta, nodes } = drainage.network;
  const names = Object.fromEntries(nodes.features.map((f) => [f.properties.id, f.properties.name]));
  const list = (ids: string[]) => ids.map((i) => names[i] ?? i).join(", ");
  const exitsNorth = meta.terminal_exit_sides.north ?? 0;
  const ends = Object.values(meta.terminal_exit_sides).reduce((a, b) => a + b, 0);
  const hub = [...nodes.features].sort((a, b) => b.properties.n_upstream - a.properties.n_upstream)[0]?.properties;

  return (
    <div className="space-y-7 px-5 pb-10 pt-5 md:px-7">
      <Kicker>Drainage</Kicker>
      <div>
        <h2 className="font-display text-[27px] font-medium leading-[1.15] tracking-[-0.01em] md:text-[30px]">
          {exitsNorth === ends ? "All water leaves the city northward, toward the Najafgarh drain." : `${exitsNorth} of ${ends} flow paths leave the city northward.`}
        </h2>
        <p className="mt-2 text-[13px] leading-snug text-ink-2">
          {plural(meta.n_edges, "link")} between {meta.n_hotspots} mapped hotspots, worked out from ground height and mapped
          drains.{hub && hub.n_upstream > 1 ? ` ${hub.name} collects water from ${hub.n_upstream} other hotspots.` : ""}
        </p>
      </div>

      <section>
        <Kicker className="mb-2">Critical intervention points</Kicker>
        <p className="mb-3 text-[12.5px] text-ink-3">
          Ranked by how many hotspots lie downstream: clearing drains here also helps those.
        </p>
        <div className="grid grid-cols-[28px_1fr_64px] border-b border-ink pb-1.5">
          <span className="kicker">#</span>
          <span className="kicker">Hotspot</span>
          <span className="kicker text-right">Drains</span>
        </div>
        <ol>
          {nodes.features.map(({ properties: p }) => (
            <li key={p.id} className={`border-b border-rule ${selectedId === p.id ? "bg-paper-2" : ""}`}>
              <button onClick={() => onSelect(p.id)} className="grid w-full grid-cols-[28px_1fr_64px] items-baseline py-2.5 text-left hover:bg-paper-2">
                <span className="font-mono tabular text-[12px] text-ink-3">{String(p.critical_rank).padStart(2, "0")}</span>
                <span>
                  <span className="text-[14.5px] font-medium">{p.name}</span>
                  <span className="mt-0.5 block space-y-0.5 text-[12px] text-ink-2">
                    {p.n_downstream > 0 && <span className="block">→ flows on to {list(p.downstream)}</span>}
                    {p.n_upstream > 0 && <span className="block">← receives water from {list(p.upstream)}</span>}
                    {!p.on_flow_line && <span className="block text-ink-3">Off the main flow lines: local runoff</span>}
                    {p.catchment_truncated && <span className="block text-risk-amber">Catchment runs past the map edge</span>}
                  </span>
                </span>
                <span className="font-mono tabular text-right text-[13px] text-ink-2">
                  {p.max_drained_km2_150m < 1 ? p.max_drained_km2_150m.toFixed(2) : p.max_drained_km2_150m.toFixed(1)}
                  <span className="text-ink-3"> km²</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <Rule />
      <footer className="space-y-2 text-[12px] leading-relaxed text-ink-3">
        <p className="text-ink-2">{meta.caveat}</p>
        <p>
          Ground height: Copernicus DEM GLO-30 (© DLR / Airbus). Drains: OpenStreetMap contributors. Built-up land: ESA
          WorldCover 2021. Method and limits in docs/NETWORK.md.
        </p>
      </footer>
    </div>
  );
}
