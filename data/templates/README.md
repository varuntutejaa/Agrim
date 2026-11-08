# Templates for MCG / GMDA data

Header-only CSV templates for the data requested in `docs/DATA_REQUIREMENTS.md`.
They contain **no example rows**, on purpose: any row in Agrim must be real.
Fill a copy with MCG's data and keep it outside `data/templates/`.

| File | Request | Columns | Used by |
|---|---|---|---|
| `mcg_hotspots.csv` | D1 graded hotspot list | `mcg_id`, `name`, `zone` (e.g. VI), `severity_grade` (MCG's own: extremely critical / critical / moderate / low, or A/B/C), `lat`, `lon` (WGS84), `location_kind` (junction / road / area, optional) | `python -m pipeline.import_mcg hotspots FILE` |
| `mcg_storm_reports.csv` | D2 post-storm records, **including watched points that stayed clear** | `storm_date` (YYYY-MM-DD), `mcg_id` or `name`, `waterlogged` (yes/no), `depth_cm`, `duration_hours`, `report_time` (ISO, optional), `notes` | `python -m pipeline.import_mcg storm-reports FILE --reference "MCG letter no. …"` |
| `rain_gauges.csv` | D3 gauge readings | `station`, `lat`, `lon`, `time` (ISO, IST), `rain_mm`, `interval_minutes` (60 hourly, 1440 daily) | Planned: replaces model rain for past days and bias-corrects the forecast |
| `drain_desilting.csv` | D4 drain condition (alignments as GeoJSON lines with `drain_id`) | `drain_id`, `drain_name`, `last_desilted` (YYYY-MM-DD), `status` | Planned: drains burned into the terrain; `drain_silt_status` input |
| `pumps.csv` | D5 equipment register | `pump_id`, `type`, `capacity_lps`, `base_location`, `lat`, `lon`, `status` (free / deployed / repair) | Planned: pump-specific orders |
| `complaints.csv` | D7 citizen complaints (no personal details) | `time`, `lat`, `lon`, `locality`, `category` | Planned: live confirmation, extra labels |

Zone boundaries (D6) are accepted as GeoJSON polygons with a `zone` property.
The officer roster stays on the server (never in the repo or a public page).
