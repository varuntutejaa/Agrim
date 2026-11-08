// Shared risk wording and colours, so the map, list and popup always agree.
import type { RiskLevel, WindowRisk } from "./types";

export const LEVEL_COLOR: Record<RiskLevel | "none", string> = {
  red: "#dc2626",
  amber: "#f59e0b",
  green: "#16a34a",
  none: "#94a3b8", // not scored (no location yet)
};

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  red: "Likely flooding",
  amber: "Possible flooding",
  green: "Low risk",
};

export function confidenceLabel(w: WindowRisk): string | null {
  if (!w.confidence) return null;
  return { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }[w.confidence];
}

/** "6 PM – 10 PM, Sat" style wording for the wettest hours. */
export function wetWindowLabel(w: WindowRisk): string | null {
  const ww = w.rain.wet_window;
  if (!ww) return null;
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
  const day = new Date(ww.start).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${t(ww.start)} – ${t(ww.end)}, ${day}`;
}
