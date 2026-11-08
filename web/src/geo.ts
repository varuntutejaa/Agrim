import type { RainCollection, RainProps } from "./types";

// Rain summary of the grid point closest to (lon, lat). The grid is ~2 km,
// so plain degree distance (with a cos(lat) correction) is accurate enough.
export function nearestRain(rain: RainCollection | null, lon: number, lat: number): RainProps | null {
  if (!rain?.features.length) return null;
  const k = Math.cos((lat * Math.PI) / 180);
  let best: RainProps | null = null;
  let bestD = Infinity;
  for (const f of rain.features) {
    const [x, y] = f.geometry.coordinates;
    const d = ((x - lon) * k) ** 2 + (y - lat) ** 2;
    if (d < bestD) {
      bestD = d;
      best = f.properties;
    }
  }
  return best;
}
