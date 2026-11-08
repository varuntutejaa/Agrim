// Thin wrappers around the Agrim API.
import type { DrainageLayers, HotspotCollection, RainCollection } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchHotspots = () => getJson<HotspotCollection>("/hotspots");
export const fetchRain = () => getJson<RainCollection>("/rain/latest");

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
