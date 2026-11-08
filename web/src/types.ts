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

export type View = "rain" | "drainage";
