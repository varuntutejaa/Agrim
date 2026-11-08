"""Train the Tier B model (XGBoost) on real flood labels, and check it honestly.

Run from the repo root:
    python -m model.train

Steps
1. Labels: data/incidents.csv (sourced reports) + MCG officer reports (database).
2. Features for each (hotspot, day) from the ECMWF record: rain, how unusual
   it is, terrain, and the rule score (model/features.py). Labels on days the
   record doesn't cover (outside Jun-Sep 2018-2026) are skipped and counted.
3. If there are too few labels (MIN_LABELS overall, MIN_PER_CLASS floods and
   dry cases), stop and say so. That status is what the app shows.
4. Check: cross-validation that holds out whole storm days, so the same
   storm never sits in both training and testing. Reports precision (how many
   alarms were right) and recall (how many floods were caught), next to the
   rule-based score on the same events.
5. Fit on all labels and save data/model/xgb_model.json + ml_status.json.

The rules stay in charge of Red/Amber/Green. The model adds a probability
and its top three reasons (SHAP), until the team decides it is good enough
to lead.
"""
import json
from datetime import date, datetime
from zoneinfo import ZoneInfo

import numpy as np

from model import rules
from model.features import FEATURES, feature_row, past_day_rain, record_covers
from model.labels import load_labels
from pipeline.config import DATA_DIR, TIMEZONE

MODEL_JSON = DATA_DIR / "model" / "xgb_model.json"
STATUS_JSON = DATA_DIR / "model" / "ml_status.json"
MIN_LABELS = 30
MIN_PER_CLASS = 8
THRESHOLD = 0.5
PARAMS = {  # small, conservative model: few labels, so keep it shallow
    "n_estimators": 200, "max_depth": 3, "learning_rate": 0.05, "subsample": 0.8,
    "colsample_bytree": 0.8, "min_child_weight": 2, "reg_lambda": 1.0, "eval_metric": "logloss",
}


def build_dataset(labels: list[dict]):
    """(X, y, groups, skipped) for labels the ECMWF record covers."""
    from model.run_forecast import load_static
    from model.simulate import _replay_days
    terrain, clim, hotspots = load_static()
    days = _replay_days()
    record = set(days)
    X, y, groups, skipped = [], [], [], []
    for lab in labels:
        hid, d = lab["hotspot_id"], date.fromisoformat(lab["date"])
        if hid not in terrain or hid not in clim:
            skipped.append({**lab, "why": "hotspot has no location / terrain yet"})
            continue
        if not record_covers(d, record):
            skipped.append({**lab, "why": "day outside the Jun-Sep 2018-2026 rain record"})
            continue
        rain = past_day_rain(days.get(lab["date"]), hid, terrain[hid]["upstream_ids"])
        row = feature_row(rain, terrain[hid], clim[hid], hotspots[hid])
        X.append([row[f] for f in FEATURES])
        y.append(int(lab["flooded"]))
        groups.append(lab["date"])
    return np.array(X, dtype=float).reshape(-1, len(FEATURES)), np.array(y), np.array(groups), skipped


def _scores(y_true, y_pred) -> dict:
    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    tn = int(((y_pred == 0) & (y_true == 0)).sum())
    precision = tp / (tp + fp) if tp + fp else None
    recall = tp / (tp + fn) if tp + fn else None
    f1 = 2 * precision * recall / (precision + recall) if precision and recall else None
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "precision": None if precision is None else round(precision, 3),
            "recall": None if recall is None else round(recall, 3),
            "f1": None if f1 is None else round(f1, 3)}


def train(labels: list[dict], save: bool = True) -> dict:
    from model.xgb import xgboost

    X, y, groups, skipped = build_dataset(labels)
    n_pos, n_neg = int(y.sum()), int(len(y) - y.sum())
    status = {
        "run_at": datetime.now(ZoneInfo(TIMEZONE)).isoformat(timespec="seconds"),
        "n_labels_total": len(labels),
        "n_usable": int(len(y)), "n_floods": n_pos, "n_dry": n_neg,
        "n_storm_days": int(len(set(groups))),
        "n_skipped": len(skipped),
        "skipped_reasons": sorted({s["why"] for s in skipped}),
        "sources": {s: sum(1 for lab in labels if s in lab["sources"]) for s in ("report", "mcg", "officer")},
        "needs": {"min_labels": MIN_LABELS, "min_per_class": MIN_PER_CLASS},
        "features": FEATURES,
        "is_synthetic": False,
    }
    if len(y) < MIN_LABELS or n_pos < MIN_PER_CLASS or n_neg < MIN_PER_CLASS or len(set(groups)) < 3:
        status["status"] = "insufficient"
        status["message"] = (f"Not trained: needs {MIN_LABELS} usable labels with at least {MIN_PER_CLASS} floods "
                             f"and {MIN_PER_CLASS} dry cases; has {len(y)} ({n_pos} floods, {n_neg} dry).")
        if save:
            _save_status(status)
        return status

    from sklearn.model_selection import GroupKFold

    def fit(Xt, yt):
        pos, neg = yt.sum(), len(yt) - yt.sum()
        model = xgboost.XGBClassifier(**PARAMS, scale_pos_weight=(neg / pos) if pos else 1.0)
        return model.fit(Xt, yt)

    # Out-of-fold predictions, holding out whole storm days.
    oof = np.zeros(len(y))
    folds = GroupKFold(n_splits=min(5, len(set(groups))))
    for train_idx, test_idx in folds.split(X, y, groups):
        if len(set(y[train_idx])) < 2:
            oof[test_idx] = y[train_idx].mean()
            continue
        oof[test_idx] = fit(X[train_idx], y[train_idx]).predict_proba(X[test_idx])[:, 1]
    ml_pred = (oof >= THRESHOLD).astype(int)
    rule_pred = (X[:, FEATURES.index("rule_score")] >= rules.FLOOD_SCORE).astype(int)

    try:
        from sklearn.metrics import roc_auc_score
        auc = round(float(roc_auc_score(y, oof)), 3)
    except ValueError:
        auc = None

    final = fit(X, y)
    contribs = final.get_booster().predict(xgboost.DMatrix(X, feature_names=FEATURES), pred_contribs=True)[:, :-1]
    importance = dict(sorted(zip(FEATURES, np.abs(contribs).mean(axis=0).round(4).tolist()), key=lambda kv: -kv[1]))

    status.update({
        "status": "trained",
        "threshold": THRESHOLD,
        "check": "cross-validation holding out whole storm days",
        "model": {**_scores(y, ml_pred), "auc": auc},
        "rules_baseline": _scores(y, rule_pred),
        "importance": importance,
        "calibrated": False,
        "message": (f"Trained on {len(y)} labels ({n_pos} floods, {n_neg} dry) from {len(set(groups))} storm days. "
                    f"Probabilities are not calibrated yet."),
    })
    if save:
        MODEL_JSON.parent.mkdir(parents=True, exist_ok=True)
        final.get_booster().save_model(str(MODEL_JSON))
        _save_status(status)
    return status


def _save_status(status: dict):
    STATUS_JSON.parent.mkdir(parents=True, exist_ok=True)
    STATUS_JSON.write_text(json.dumps(status, indent=2))
    if status["status"] != "trained" and MODEL_JSON.exists():
        MODEL_JSON.unlink()   # never serve a model the current labels can't support


def main():
    labels = load_labels()
    status = train(labels)
    print(status["message"])
    if status["skipped_reasons"]:
        print(f"Skipped {status['n_skipped']} labels: " + "; ".join(status["skipped_reasons"]))
    if status["status"] == "trained":
        m, r = status["model"], status["rules_baseline"]
        print(f"Held-out storm days  model: precision {m['precision']} recall {m['recall']} (AUC {m['auc']})")
        print(f"                     rules: precision {r['precision']} recall {r['recall']}")
        print("Top features: " + ", ".join(list(status["importance"])[:5]))
    print(f"Status written to {STATUS_JSON}")


if __name__ == "__main__":
    main()
