// Thin wrappers around the Agrim API.
import type {
  CheckItem, CheckTick, DrainageLayers, FeedbackRecord, HotspotCollection, Orders, OverrideRecord, RainCollection,
  ReplayEvent, RiskLevel, RiskResult, SimRequest, SimResult,
} from "./types";

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

// --- MCG operations desk ---

/** Desk code (only needed when the server sets OPS_TOKEN). Kept in this browser only. */
const DESK_KEY = "agrim.deskCode";
export const deskCode = {
  get: () => { try { return localStorage.getItem(DESK_KEY) ?? ""; } catch { return ""; } },
  set: (v: string) => { try { localStorage.setItem(DESK_KEY, v); } catch { /* private mode */ } },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function send<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(deskCode.get() ? { "x-agrim-desk": deskCode.get() } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const msg = typeof detail.detail === "string" ? detail.detail : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

export const fetchOrders = (zone: string, window: string) =>
  getJson<Orders>(`/orders/${encodeURIComponent(zone)}?window=${window}`);
export const fetchExerciseOrders = (req: SimRequest, zone: string) => send<Orders>("/orders/exercise", { ...req, zone });

export const fetchOverrides = () => getJson<{ available: boolean; overrides: OverrideRecord[] }>("/overrides");
export const fetchFeedback = () => getJson<{ available: boolean; feedback: FeedbackRecord[] }>("/feedback");
export const fetchChecklist = (runKey: string) =>
  getJson<{ available: boolean; ticks: CheckTick[] }>(`/checklist?run_key=${encodeURIComponent(runKey)}`);

export const postOverride = (body: {
  officer: string; hotspot_id: string; new_level: RiskLevel; reason: string; valid_hours: number;
  is_exercise: boolean; model_level: RiskLevel | null; run_id: string | null;
}) => send<OverrideRecord>("/override", body);
export const revokeOverride = (id: number, officer: string) => send<OverrideRecord>(`/override/${id}/revoke`, { officer });
export const postFeedback = (body: {
  officer: string; hotspot_id: string; event_date: string; flooded: boolean;
  depth: string | null; duration_hours: number | null; notes: string | null;
}) => send<FeedbackRecord>("/feedback", body);
export const postCheck = (body: { run_key: string; zone: string; hotspot_id: string; item: CheckItem; done: boolean; officer: string }) =>
  send<CheckTick>("/checklist", body);
export const resetExercise = () => send<{ ok: boolean }>("/exercise/reset", {});
