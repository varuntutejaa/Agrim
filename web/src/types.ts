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

export type View = "home" | "forecast" | "simulator" | "drainage" | "ops" | "about";
export type AboutTab = "about" | "backtest" | "overrides" | "data" | "sources";

// --- Risk forecast (milestone 3, see model/rules.py and docs/MODEL.md) ---

export type RiskLevel = "red" | "amber" | "green";
export type RiskWindowKey = "next_24h" | "day_2";

export type OverrideInfo = {
  id: number;
  officer: string;
  reason: string;
  created_at: string;
  valid_until: string;
  model_level: RiskLevel | null;
};

export type WindowRisk = {
  level: RiskLevel;
  model_level?: RiskLevel;     // set when an MCG officer overrode the level
  override?: OverrideInfo;
  ml?: MlOutput | null;        // Tier B probability + SHAP reasons, once a model is trained
  confidence_basis?: "models" | "scenarios";
  models?: { flooding: number; total: number; scores: Record<string, number> } | null;
  outlook: "likely" | "possible" | "unlikely";
  confidence: "high" | "medium" | "low" | null;
  high_impact: boolean;
  score: number;
  scores: { low: number; expected: number; high: number };
  points: Record<string, number>;
  drivers: string[];
  driver_facts?: { key: string; value: number; e: number | null }[];  // same reasons as numbers (for Hindi)
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

export type SimRequest = (({ mode: "storm" } & StormParams) | { mode: "replay"; date: string }) & { blocked?: string[] };

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
    blocked?: { id: string; label: string; hotspots: string[] }[];
    counts: Record<"next_24h", Record<RiskLevel, number>>;
    is_synthetic: boolean;
  };
  hotspots: HotspotRisk[];
};

// --- MCG operations desk (milestone 5, see api/ops.py and model/orders.py) ---

export type OrderItem = {
  hotspot_id: string; name: string; zone: string; level: RiskLevel;
  onset: string; t12: string; t3: string; t24: string; overridden: boolean;
};

export type Orders = {
  zone: string;
  window: RiskWindowKey;
  exercise: boolean;
  issued_at: string;
  counts: Record<RiskLevel, number>;
  text: string;
  items: OrderItem[];
  sms: { hotspot_id: string; level: RiskLevel; text: string }[];
  zones: string[];
};

export type OverrideRecord = OverrideInfo & {
  hotspot_id: string; new_level: RiskLevel; is_exercise: boolean; run_id: string | null;
  revoked_at: string | null; revoked_by: string | null;
};

export type FeedbackRecord = {
  id: number; created_at: string; officer: string; hotspot_id: string; event_date: string;
  flooded: boolean; depth: string | null; duration_hours: number | null; notes: string | null;
  predicted_level: RiskLevel | null; run_id: string | null;
};

export type CheckItem = "list_issued" | "gullies_cleared" | "pump_moved" | "pump_tested";
export type CheckTick = { run_key: string; zone: string; hotspot_id: string; item: CheckItem; done: boolean; officer: string; updated_at: string };
export type OpsSource = "live" | "exercise";

// --- Machine-learning model (milestone 6, see model/train.py and model/ml.py) ---

export type MlOutput = {
  probability: number;
  drivers: { feature: string; push: "up" | "down"; text: string }[];
};

type Scores = { precision: number | null; recall: number | null; tp: number; fp: number; fn: number; tn: number };

export type ModelStatus = {
  status: "trained" | "insufficient" | "not_run";
  message: string;
  run_at?: string;
  n_usable?: number;
  n_floods?: number;
  n_dry?: number;
  n_storm_days?: number;
  n_skipped?: number;
  skipped_reasons?: string[];
  needs?: { min_labels: number; min_per_class: number };
  model?: Scores & { auc: number | null };
  rules_baseline?: Scores;
  importance?: Record<string, number>;
  labels_now?: { reports: number; report_floods: number };
};

// --- Alerts and scorecard (milestone 7, see model/alerts.py and api/ops.py) ---

export type CitizenItem = {
  hotspot_id: string; name: string; level: RiskLevel;
  when_en: string; when_hi: string; tip_en: string; tip_hi: string; tip_sourced: boolean;
};

export type AlertDraft = { hotspot_id: string; name: string; level: RiskLevel; sms_en: string; sms_hi: string; ivr: string };

export type AlertRecord = {
  id: number; created_at: string; officer: string; hotspot_id: string; level: RiskLevel; is_exercise: boolean;
  channel: string; recipient: string; status: string; detail: string | null; sms_en: string; sms_hi: string;
};

export type Scorecard = {
  available: boolean;
  counts?: { hits: number; misses: number; false_alarms: number; correct_clear: number };
  reports_total?: number;
  reports_judged?: number;
  reports_without_forecast?: number;
  flood_catch_rate?: number | null;
  alarm_accuracy?: number | null;
  overrides?: { id: number; hotspot_id: string; officer: string; model_level: RiskLevel | null; new_level: RiskLevel;
    created_at: string; outcome: string | null; officer_right: boolean | null; model_right: boolean | null }[];
  note?: string;
};

// --- Review items: critical points, backtest, public overrides, proposed sensors ---

export type CriticalProps = {
  id: string; rank: number; hotspot_id: string; label: string; n_hotspots: number; hotspots: string[];
  upstream_names: string[]; drained_km2: number; priority_order: number | null;
};
export type CriticalNodes = GeoJSON.FeatureCollection<GeoJSON.Point, CriticalProps> & {
  summary: {
    n_hotspots: number; n_points: number; n_priority: number; priority_share: number; priority_covers: number;
    cover_target: number; curve: { points: number; hotspots: number }[]; top_label: string; top_serves: number;
    cost_note: string;
  };
};

export type BacktestRow = {
  date: string; hotspot_id: string; name: string; flooded: boolean; level: RiskLevel; score: number;
  outcome: "caught" | "missed" | "false alarm" | "correct"; reason: string | null;
  model_rain_mm: number; model_peak_mm: number; how_unusual: string; source_url: string;
};
export type Backtest = {
  reviewed_only: boolean; n: number; candidates_pending: number;
  counts: Record<"caught" | "missed" | "false alarm" | "correct", number>;
  catch_rate: number | null; miss_reasons: Record<string, number>; skipped: Record<string, number>;
  days: { date: string; caught: number; missed: number; model_rain_min: number; model_rain_max: number }[];
  rows: BacktestRow[]; note: string;
};

export type PublicOverride = {
  id: number; created_at: string; hotspot_id: string; hotspot_name: string; model_level: RiskLevel | null;
  new_level: RiskLevel; reason: string; valid_until: string; revoked_at: string | null;
};

export type SensorKind = "rain_gauge" | "drain_sensor" | "underpass_monitor";
export type ProposedSensors = GeoJSON.FeatureCollection<GeoJSON.Point, { kind: SensorKind; label: string; why: string }> & {
  meta: { counts: Record<SensorKind, number>; label: string };
};
