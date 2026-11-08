"""Use the trained Tier B model: a flood probability plus its top three reasons.

The reasons are SHAP values, computed by XGBoost itself (pred_contribs),
so the server doesn't need the heavy `shap` package. Each value says how much a
feature pushed this prediction up or down from the model's average.

If no model is trained (the usual case until enough real flood labels
exist), everything here returns None and the app shows the rules alone.
"""
import json

import numpy as np

from model.features import FEATURES, LABELS
from model.train import MODEL_JSON, STATUS_JSON

_cache: dict = {}


def status() -> dict:
    """Training status for the app: trained / insufficient / never run."""
    if not STATUS_JSON.exists():
        return {"status": "not_run", "message": "Not trained yet: no training run on record."}
    return json.loads(STATUS_JSON.read_text())


def _booster():
    if not MODEL_JSON.exists() or status().get("status") != "trained":
        return None
    mtime = MODEL_JSON.stat().st_mtime
    if _cache.get("mtime") != mtime:
        from model.xgb import xgboost
        booster = xgboost.Booster()
        booster.load_model(str(MODEL_JSON))
        _cache.update(mtime=mtime, booster=booster)
    return _cache["booster"]


def available() -> bool:
    return _booster() is not None


def explain(rows: list[dict]) -> list[dict | None]:
    """Probability and top-3 reasons for each feature row (None if no model)."""
    booster = _booster()
    if booster is None or not rows:
        return [None] * len(rows)
    from model.xgb import xgboost
    X = np.array([[r[f] for f in FEATURES] for r in rows], dtype=float)
    dm = xgboost.DMatrix(X, feature_names=FEATURES)
    probs = booster.predict(dm)
    contribs = booster.predict(dm, pred_contribs=True)[:, :-1]   # last column = average (bias)
    out = []
    for row, p, c in zip(rows, probs, contribs):
        top = np.argsort(-np.abs(c))[:3]
        out.append({
            "probability": round(float(p), 3),
            "drivers": [{"feature": FEATURES[i], "push": "up" if c[i] > 0 else "down",
                         "text": f"{LABELS[FEATURES[i]](row[FEATURES[i]])} {'raises' if c[i] > 0 else 'lowers'} the risk"}
                        for i in top if abs(c[i]) > 1e-6],
        })
    return out
