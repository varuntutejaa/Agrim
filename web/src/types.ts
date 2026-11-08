// Shapes of the API responses (see api/data.py).

export type HotspotProps = {
  id: string;
  name: string;
  zone: string;
  mcg_severity_grade: string;
  verified: boolean;
  location_kind: "junction" | "road" | "area" | string;
  geocode_status: string;
  geocode_source: string;
  geocode_label: string;
  notes: string;
};

export type HotspotCollection = GeoJSON.FeatureCollection<GeoJSON.Point, HotspotProps> & {
  unlocated: { id: string; name: string }[];
};

export type RainSummary = {
  past_24h: number;
  past_72h: number;
  next_24h: number;
  next_48h: number;
  peak_1h_next_24h: number;
};

export type RainProps = RainSummary & {
  point_id: string;
  by_model: Record<string, RainSummary>;
};

export type RainMeta = {
  run_id: string;
  fetched_at: string;
  source: string;
  models: string[];
  grid_step_deg: number;
  n_points: number;
  now: string;
  age_hours: number;
  is_synthetic: boolean;
};

export type RainCollection = GeoJSON.FeatureCollection<GeoJSON.Point, RainProps> & {
  meta: RainMeta | null;
};

export type RainWindow = "next_24h" | "next_48h" | "past_72h";

// --- Drainage network (milestone 2, see pipeline/build_network.py) ---

export type NetworkNodeProps = {
  id: string;
  name: string;
  verified: boolean;
  critical_rank: number;
  n_downstream: number;
  n_upstream: number;
  downstream: string[];
  upstream: string[];
  downstream_direct: string[];
  exits: string | null;
  elevation_m: number;
  hand_m: number;
  relief_1km_m: number;
  builtup_share_500m: number;
  builtup_share_catchment: number;
  catchment_km2: number;
  max_drained_km2_150m: number;
  catchment_truncated: boolean;
  on_flow_line: boolean;
  snap_dist_m: number;
};

export type NetworkEdgeProps = {
  from: string;
  to: string | null;
  kind: "hotspot" | "exit";
  exits?: string;
  length_km: number;
};

export type NetworkMeta = {
  built_at: string;
  dem: string;
  drains: string;
  landcover: string;
  n_hotspots: number;
  n_edges: number;
  terminal_exit_sides: Record<string, number>;
  caveat: string;
  is_synthetic: boolean;
};

export type Network = {
  meta: NetworkMeta;
  nodes: GeoJSON.FeatureCollection<GeoJSON.Point, NetworkNodeProps>;
  edges: GeoJSON.FeatureCollection<GeoJSON.LineString, NetworkEdgeProps>;
};

/** Everything the drainage view draws, loaded together on first open. */
export type DrainageLayers = {
  network: Network;
  catchments: GeoJSON.FeatureCollection;
  streams: GeoJSON.FeatureCollection;
  drains: GeoJSON.FeatureCollection;
};

export type View = "forecast" | "simulator" | "drainage";

// --- Risk forecast (milestone 3, see model/rules.py and docs/MODEL.md) ---

export type RiskLevel = "red" | "amber" | "green";
export type RiskWindowKey = "next_24h" | "day_2";

export type WindowRisk = {
  level: RiskLevel;
  outlook: "likely" | "possible" | "unlikely";
  confidence: "high" | "medium" | "low" | null;
  high_impact: boolean;
  score: number;
  scores: { low: number; expected: number; high: number };
  points: Record<string, number>;
  drivers: string[];
  action: string;
  rain: {
    rain_24h: number;
    peak1h: number;
    upstream_rain_24h: number;
    rain_past_72h: number;
    rain_24h_by_model: Record<string, number>;
    wet_window: { start: string; end: string } | null;
  };
};

export type HotspotRisk =
  | {
      id: string; name: string; zone: string; verified: boolean; scored: true;
      critical_rank: number;
      downstream: string[];
      windows: Record<RiskWindowKey, WindowRisk>;
      history: { reports: number; flooded: number; flood_rate: number | null };
    }
  | { id: string; name: string; zone: string; verified: boolean; scored: false; reason: string };

export type RiskResult = {
  meta: {
    run_id: string;
    generated_at: string;
    forecast_fetched_at: string;
    forecast_models: string[];
    scored_with_model: string;
    windows: Record<RiskWindowKey, { start: string; end: string }>;
    method: string;
    calibrated: boolean;
    flood_reports: number;
    note: string;
    counts: Record<RiskWindowKey, Record<RiskLevel, number>>;
    is_synthetic: boolean;
  };
  hotspots: HotspotRisk[];
};

// --- Simulator (milestone 4, see model/simulate.py) ---

export type ReplayEvent = {
  id: string;
  date: string;
  title: string;
  source: "model record" | "team";
  note: string;
  city_mean_mm: number;
  max_mm: number;
  peak1h_mm: number;
};

export type StormParams = {
  rain_24h: number;
  peak1h: number;
  past_72h: number;
  centre: [number, number] | null; // [lon, lat]; null = even rain across the city
  radius_km: number;
};

export type SimRequest = ({ mode: "storm" } & StormParams) | { mode: "replay"; date: string };

export type SimResult = {
  meta: {
    is_simulation: true;
    exercise_label: string;
    note: string;
    note_hi: string;
    mode: "storm" | "replay";
    params: Record<string, unknown>;
    event?: ReplayEvent | null;
    rarity?: { rain_24h: string; peak1h: string };
    counts: Record<"next_24h", Record<RiskLevel, number>>;
    is_synthetic: boolean;
  };
  hotspots: HotspotRisk[];
};
