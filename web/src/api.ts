// Thin wrappers around the Agrim API.
import type { HotspotCollection, RainCollection } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchHotspots = () => getJson<HotspotCollection>("/hotspots");
export const fetchRain = () => getJson<RainCollection>("/rain/latest");
