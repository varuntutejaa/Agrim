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
