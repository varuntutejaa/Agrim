// Thin wrappers around the Agrim API.
import type { DrainageLayers, HotspotCollection, RainCollection, ReplayEvent, RiskResult, SimRequest, SimResult } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchHotspots = () => getJson<HotspotCollection>("/hotspots");
export const fetchRain = () => getJson<RainCollection>("/rain/latest");
export const fetchRisk = () => getJson<RiskResult>("/forecast/latest");

// The drainage layers are ~0.6 MB, so they are fetched only when the drainage view is opened.
export async function fetchDrainage(): Promise<DrainageLayers> {
  const [network, catchments, streams, drains] = await Promise.all([
    getJson<DrainageLayers["network"]>("/network"),
    getJson<GeoJSON.FeatureCollection>("/network/catchments"),
    getJson<GeoJSON.FeatureCollection>("/network/streams"),
    getJson<GeoJSON.FeatureCollection>("/network/drains"),
  ]);
  return { network, catchments, streams, drains };
}

// --- Simulator ---

export const fetchReplayEvents = () =>
  getJson<{ version: string; events: ReplayEvent[] }>("/simulate/events");
export const fetchReplayDates = () => getJson<{ dates: string[] }>("/simulate/dates");

export async function simulate(req: SimRequest, signal?: AbortSignal): Promise<SimResult> {
  const res = await fetch(`${API_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) throw new Error(`simulate failed: ${res.status}`);
  return res.json() as Promise<SimResult>;
}
