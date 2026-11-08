# Risk model

Two tiers. **Tier A (rules)** runs now and needs no flood records.
**Tier B (XGBoost + SHAP)** comes in milestone 6, once `data/incidents.csv`
has enough sourced flood reports.

Code: `model/rules.py` (the score), `model/climatology.py` (each hotspot's
rain record), `model/run_forecast.py` (scores the live forecast).
Tests: `tests/test_rules.py`.

## Why rain is scored against each hotspot's own record

The forecast models behind Open-Meteo are much smoother than a rain gauge.
In ECMWF's 2018–2026 monsoon record over Gurugram:

- daily rain reached IMD's "heavy" mark (64.5 mm) on only **2 days** out of 1,098;
- the wettest single hour was about **30 mm**;
- 31 Jul 2025, a day with widely reported waterlogging, shows only **25–30 mm**.

Scoring model rain against gauge thresholds would therefore almost never
flag anything. Instead, the forecast is compared with **the same model's own
history at that hotspot**: "wetter than 99% of monsoon hours here". This is
the approach JalNetra's river monitor used, where each river point was
judged against its own record.

`model/climatology.py` computes, for each hotspot and every monsoon hour of
2018–2026 (ECMWF IFS), three rolling windows: 24 h total, wettest hour in
24 h, and 72 h total. It saves their percentiles to
`data/model/rain_climatology.csv`.

Rarity is expressed as e = −log10(1 − percentile): 90th percentile → 1,
99th → 2, 99.9th → 3. On the screen it's shown as "about once a monsoon",
"about once in 8 monsoons", and so on (assuming 122 monsoon days a year).

## Tier A: the points score (rules-v1)

These are **starting values chosen by the team, not fitted to past floods.**
They must be recalibrated once incidents.csv has events.

| Part | What | Points | 0 points at | Full points at |
|------|------|-------:|-------------|----------------|
| A | Forecast rain, next 24 h, nearest grid point | 35 | 90th percentile of this spot's record | 99.9th percentile |
| B | Wettest forecast hour | 20 | 90th percentile | 99.9th percentile |
| C | Forecast rain over the upstream area (own catchment + upstream hotspots' catchments) | 10 × min(1, upstream km² ÷ 10) | 90th percentile | 99.9th percentile |
| D | Ground already wet: rain in the last 72 h | 10 | 90th percentile of 72 h totals | 99.9th percentile |
| E1 | Low spot: height vs average of surrounding 1 km | 10 | +1 m | −3 m |
| E2 | Near drain level (height above nearest drainage) | 5 | 5 m | 0.5 m |
| E3 | Built-up share within ~500 m | 5 | 0% | 100% |
| E4 | Land draining towards it (within 150 m, log scale) | 5 | 0.1 km² | 50 km² |

- **Floods** in a scenario when the score is **≥ 50**. Terrain plus wet
  ground can reach at most 35, so nothing floods without forecast rain.
- The score uses **ECMWF**, the same model as the record. GFS and ICON
  totals are reported beside it, to show how much the models disagree.

## Confidence and levels

Each window is scored three times, with forecast rain × 0.7 (low), × 1.0
(expected) and × 1.4 (high). Past rain isn't scaled, because it has already
fallen.

| Outlook | Rule | Confidence |
|---------|------|------------|
| Likely | floods in expected **and** high | High if it also floods in low, else Medium |
| Possible | floods only in high | Low |
| Unlikely | floods in none | – |

| Level | Rule | Recommended action (SOP) |
|-------|------|--------------------------|
| **Red** | Likely **and** high impact: expected score ≥ 65, or water flows on to another hotspot, or MCG severity grade A / 1 / High | Move a pump here and clear gullies by T-12 h; test the pump at T-3 h |
| **Amber** | Possible, or Likely with lower impact | Clear gullies by T-12 h; keep a pump on standby nearby |
| **Green** | Unlikely | No action |

**Drivers:** the three parts that added the most points, in plain words
(e.g. "Sits 2.4 m below its surroundings").

**Probability:** the score is **not** a probability, and the API and UI say
so. A calibrated probability needs flood records (Tier B).

## Windows and timing

- **Next 24 h** and **Day 2** (24–48 h ahead), from the hour of the run (IST).
- **Wettest hours:** hours with at least half of the peak rate (and ≥ 1 mm),
  used for alert wording like "6–10 PM today".

## Inputs not used yet (kept as empty fields)

- `drain_silt_status`, `drain_level_m`: null until MCG or sensor data exists.
- `history.flood_rate`: past flood rate at the hotspot, shown once it has
  ≥ 3 sourced reports in incidents.csv. It isn't in the score, because Tier A
  must work without labels.

## Check on past days (ECMWF record, all 19 hotspots)

| Day | Model rain (24 h, peak hour) | Red / Amber / Green |
|-----|------------------------------|---------------------|
| 19 Jul 2021 | 90 mm, 11 mm/h | 8 / 11 / 0 |
| 12 Sep 2024 | 73 mm, 14 mm/h | 14 / 5 / 0 |
| 31 Jul 2024 | 67 mm, 23 mm/h | 12 / 7 / 0 |
| 7 Aug 2026 | 52 mm, 10 mm/h | 0 / 13 / 6 |
| 1 Sep 2025 | 39 mm, 10 mm/h | 0 / 8 / 11 |
| 31 Jul 2025 | 30 mm, 6 mm/h | 0 / 1 / 18 |
| 15 Jul 2023 | 12 mm, 2 mm/h | 0 / 0 / 19 |

Hero Honda Chowk scores highest on every day. **31 Jul 2025 is a known
miss.** The model's rain that day is far below what was reported on the
ground, which is the main weakness of model rain for short cloudbursts.
Thresholds should be retuned on sourced flood reports, not on this one
anecdote.

## Scheduling

`api/scheduler.py` (on when `SCHEDULER=on`): fetch and re-score at 05:05 and
17:05 IST. While any hotspot is Red or Amber ("storm mode"), it runs every
hour. Results are precomputed into `data/forecast/latest_risk.json`, so the
map never waits on the weather service.

## Simulator (milestone 4)

`model/simulate.py`, served by `POST /simulate`, runs **the same rules** on
rain the presenter chooses. Results are always labelled **EXERCISE / अभ्यास**
and flagged `is_synthetic: true`.

- **Design a storm:** 24 h rain, heaviest hour and rain in the 3 days
  before, either across the whole city or as a local storm. A local storm's
  rain fades with distance from the centre: × exp(−½ (d / radius)²), so it's
  61% at one radius and 14% at two. Upstream rain is the average of that
  factor over each hotspot's upstream grid points. The heaviest hour is
  capped at the 24 h total.
- **Replay a day:** any monsoon day 2018–2026 with rain, from
  `data/model/replay_days.csv` (ECMWF, IST calendar day). Upstream rain is
  the average over the hotspot and its upstream hotspots. Curated days live
  in `data/model/replay_events.json` (`python -m model.replay`). Each is
  marked either **model record** (wettest days, derived from the data) or
  **team** (dates the team picked; add sourced flood reports before
  presenting one as a confirmed flood).
- **Quick-storm names** ("once a monsoon", "once a decade") come from
  the same rarity scale as the score, measured at a typical hotspot.

## Tier B: XGBoost + SHAP (milestone 6)

Code: `model/labels.py`, `model/features.py`, `model/train.py`, `model/ml.py`.
Run `python -m model.train` after adding labels.

- **Labels (real only):** `data/incidents.csv` (sourced reports) plus officer
  reports from the MCG desk. If two reports cover the same hotspot and day,
  it counts as flooded if either says so.
- **Features:** rain on the day (ECMWF record), how rare that rain is at the
  hotspot, terrain, and the rule score, so the model learns corrections to
  the rules.
- **Minimum to train:** 30 usable labels, with at least 8 floods and 8 dry
  cases, from 3 or more storm days. Below that, nothing is trained, any old
  model file is deleted, and the app says "Not trained".
- **Check:** cross-validation that holds out whole storm days, comparing
  precision (alarms that were right) and recall (floods caught) for the
  model and for the rules on the same events.
- **Explanations:** SHAP values from XGBoost itself (`pred_contribs`). The
  top three are shown in plain words. The server doesn't need the `shap` package.
- **Role:** the rules still set Red/Amber/Green. The model adds a probability
  (not yet calibrated) and its reasons, until the team decides it should lead.

### Collecting labels

`data/incidents_candidates.csv` holds **48 candidate flood reports from news
coverage** (9 storm days, 16 hotspots), each with its source link and what
the article says. Two of the days (19 Aug 2020, 9 Jul 2023) came from the
public India Flood Inventory (`python -m pipeline.fetch_ifi`). It records
floods per district, not per hotspot, so its dates were used to find
hotspot-level news reports.

**No public dataset has dated, hotspot-level waterlogging for Gurugram.**
(Checked 8 Nov 2026: national inventories are district-level; MCG's lists of
154–159 waterlogging points are reported only as counts; citizen apps such
as IIT Delhi's Aab Prahari don't publish data.) The best remaining source is
MCG/GMDA itself: the graded list of 159 hotspots and the location lists
compiled after storms. Ask for them directly, or file an RTI request. They are **not** training data until a team member checks
each one and accepts it with `python -m pipeline.review_candidates`.

News almost only reports floods. The model also needs **dry cases** ("rain
fell, this hotspot stayed clear"), which mostly come from officers' "Report"
form on the MCG desk after each storm.

### Early check of the rules against the candidates (unreviewed, 8 Nov 2026)

On the 39 candidate hotspot-days that have a map pin, the rules gave 5 Red,
7 Amber and 27 Green: **12 of 39 reported floods flagged.** All the misses
are on days when the model's rain was far below what the city reported.
For example: 9 Jul 2023, model 12–21 mm, reports of 150 mm. 11 Aug 2024,
model 11–16 mm, the city reported 53 mm by 8:30 am. 9 Jul 2025, model
7–11 mm, 2.5 ft of water at Subhash Chowk. This confirms the main limit: global-model rain
misses short cloudbursts. Fixes worth trying, in order: (1) lower the rain
thresholds using reviewed labels; (2) add gauge rain (IMD AWS / district
gauges) for past events; (3) a nowcast feed for the last few hours before
rain.
