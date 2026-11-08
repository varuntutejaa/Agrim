# /model

Risk scoring lives here (empty until milestone 3).

- `rules.py` (M3): transparent rule-based score, thresholds documented in `docs/MODEL.md`
- `train.py`, `evaluate.py` (M6): XGBoost on `data/incidents.csv`, SHAP drivers, held-out precision/recall
