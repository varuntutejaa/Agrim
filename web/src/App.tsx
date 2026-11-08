// Milestone 1 page: hotspots + rainfall on a map.
// Mobile: map on top, panel below. Desktop: panel on the left, map on the right.
import { useEffect, useState } from "react";
import { fetchHotspots, fetchRain } from "./api";
import HotspotMap from "./components/HotspotMap";
import HotspotPanel from "./components/HotspotPanel";
import type { HotspotCollection, RainCollection, RainWindow } from "./types";

// ?pin=1 turns on the "click to read coordinates" helper for the team.
const pinMode = new URLSearchParams(window.location.search).has("pin");

export default function App() {
  const [hotspots, setHotspots] = useState<HotspotCollection | null>(null);
  const [rain, setRain] = useState<RainCollection | null>(null);
  const [rainWindow, setRainWindow] = useState<RainWindow>("next_24h");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHotspots().then(setHotspots).catch((e) => setError(String(e)));
    fetchRain().then(setRain).catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight text-sky-900">Agrim</h1>
          <p className="text-xs text-slate-500">Gurugram flood watch</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Preview · no risk scores yet</span>
      </header>

      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-800">
          Could not reach the Agrim server ({error}). Is the API running?
        </div>
      )}
      {pinMode && (
        <div className="bg-sky-50 px-4 py-1.5 text-xs text-sky-900">
          Pin mode: click the map to read a location's coordinates.
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col md:flex-row-reverse">
        <div className="h-[55vh] shrink-0 md:h-auto md:flex-1">
          <HotspotMap
            hotspots={hotspots}
            rain={rain}
            rainWindow={rainWindow}
            selectedId={selectedId}
            onSelect={setSelectedId}
            pinMode={pinMode}
          />
        </div>
        <aside className="min-h-0 flex-1 overflow-y-auto border-slate-200 bg-slate-50 md:w-96 md:flex-none md:border-r">
          <HotspotPanel
            hotspots={hotspots}
            rain={rain}
            rainWindow={rainWindow}
            onRainWindow={setRainWindow}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>
      </main>
    </div>
  );
}
