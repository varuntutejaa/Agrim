// Shared risk wording and colours, so the map, list and popup always agree.
import { MAP } from "./mapColors";
import type { HotspotRisk, RiskLevel, WindowRisk } from "./types";

// Keep in step with the --color-risk-* tokens (index.css) via mapColors.ts.
export const LEVEL_COLOR: Record<RiskLevel | "none", string> = {
  red: MAP.red,
  amber: MAP.amber,
  green: MAP.green,
  none: MAP.none, // not scored (no location yet)
};

// The same colours as Tailwind classes, for swatches and rules in the panels.
export const LEVEL_BG: Record<RiskLevel | "none", string> = {
  red: "bg-risk-red",
  amber: "bg-risk-amber",
  green: "bg-risk-green",
  none: "bg-risk-none",
};
export const LEVEL_BORDER: Record<RiskLevel | "none", string> = {
  red: "border-risk-red",
  amber: "border-risk-amber",
  green: "border-risk-green",
  none: "border-risk-none",
};

// Words, not just colours: colour-blind readers and black-and-white printouts still work.
export const LEVEL_LABEL: Record<RiskLevel, string> = {
  red: "High",
  amber: "Medium",
  green: "Low",
};

export const LEVEL_LONG: Record<RiskLevel, string> = {
  red: "High, flooding likely",
  amber: "Medium, flooding possible",
  green: "Low risk",
};

export function confidenceLabel(w: WindowRisk): string | null {
  if (!w.confidence) return null;
  return { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }[w.confidence];
}

/** "6 pm to 10 pm, Sat 8 Nov" style wording for the wettest hours. */
export function wetWindowLabel(w: WindowRisk): string | null {
  const ww = w.rain.wet_window;
  if (!ww) return null;
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
  const day = new Date(ww.start).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${t(ww.start)} to ${t(ww.end)}, ${day}`;
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
