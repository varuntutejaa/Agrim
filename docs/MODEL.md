# Risk model

_Written in milestone 3 (rule-based score) and milestone 6 (XGBoost + SHAP)._

Planned outline:

1. **Features per hotspot per event**: forecast rain on the spot (total, peak
   hourly intensity), rain over the upstream catchment, antecedent rain
   (24 h / 72 h), elevation relative to surroundings, built-up share,
   historical flood rate at similar rainfall, drain silt status and live drain
   level (null until MCG/sensor data exists).
2. **Tier A, rule-based score**: transparent weights and thresholds,
   documented here, works with zero labels.
3. **Tier B, XGBoost**: trained on `data/incidents.csv` once there are enough
   labels; SHAP gives the top three drivers per prediction. Precision/recall on
   held-out events; if labels are too few, the UI says so.
4. **Confidence**: run each forecast at 0.7x / 1x / 1.4x rain (or model
   spread). Likely = floods at 1x and 1.4x; Possible = only at 1.4x.
5. **Levels**: Red = likely + high impact, Amber = possible, Green = low.
