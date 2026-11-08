// Shared risk wording and colours, so the map, list and popup always agree.
import type { HotspotRisk, RiskLevel, WindowRisk } from "./types";

// Keep in step with the --color-risk-* tokens in index.css.
export const LEVEL_COLOR: Record<RiskLevel | "none", string> = {
  red: "#b42318",
  amber: "#c27a0e",
  green: "#3f7a50",
  none: "#a9a39a", // not scored (no location yet)
};

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  red: "Likely",
  amber: "Possible",
  green: "Low risk",
};

export const LEVEL_LONG: Record<RiskLevel, string> = {
  red: "Flooding likely",
  amber: "Flooding possible",
  green: "Low risk",
};

export function confidenceLabel(w: WindowRisk): string | null {
  if (!w.confidence) return null;
  return { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }[w.confidence];
}

/** "6 pm – 10 pm, Sat 8 Nov" style wording for the wettest hours. */
export function wetWindowLabel(w: WindowRisk): string | null {
  const ww = w.rain.wet_window;
  if (!ww) return null;
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
  const day = new Date(ww.start).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${t(ww.start)} – ${t(ww.end)}, ${day}`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Hotspots whose water flows on to another hotspot, while they themselves are at risk. */
export function spreadingLinks(hotspots: HotspotRisk[], win: "next_24h" | "day_2") {
  const byId = new Map(hotspots.map((h) => [h.id, h]));
  const links: { from: HotspotRisk; to: HotspotRisk; level: RiskLevel }[] = [];
  for (const h of hotspots) {
    if (!h.scored) continue;
    const level = h.windows[win].level;
    if (level === "green") continue;
    for (const d of h.downstream) {
      const to = byId.get(d);
      if (to) links.push({ from: h, to, level });
    }
  }
  return links;
}
