"""Tier B checks: refuses to train on too little data; with enough labels it
trains, checks itself on held-out storm days, and explains predictions.

The labels in the second test are MADE UP inside this test only (a hotspot
"floods" when its record shows >= 40 mm that day). They exercise the code and
are never written to data/. Run:  python -m pytest -q
"""
import pytest

pytest.importorskip("sklearn")


@pytest.fixture()
def tmp_model(tmp_path, monkeypatch):
    from model import ml, train
    monkeypatch.setattr(train, "MODEL_JSON", tmp_path / "xgb_model.json")
    monkeypatch.setattr(train, "STATUS_JSON", tmp_path / "ml_status.json")
    monkeypatch.setattr(ml, "MODEL_JSON", tmp_path / "xgb_model.json")
    monkeypatch.setattr(ml, "STATUS_JSON", tmp_path / "ml_status.json")
    ml._cache.clear()
    yield train, ml
    ml._cache.clear()


def test_refuses_with_too_few_labels(tmp_model):
    train, ml = tmp_model
    labels = [{"date": "2024-07-31", "hotspot_id": "H002", "flooded": True, "sources": ["report"]}]
    st = train.train(labels)
    assert st["status"] == "insufficient" and "Not trained" in st["message"]
    assert not ml.available()


def test_skips_days_outside_the_record(tmp_model):
    train, _ = tmp_model
    st = train.train([{"date": "2017-07-01", "hotspot_id": "H002", "flooded": True, "sources": ["report"]}], save=False)
    assert st["n_skipped"] == 1 and st["n_usable"] == 0


def test_trains_checks_and_explains(tmp_model):
    train, ml = tmp_model
    from model.simulate import _replay_days
    days = _replay_days()
    labels = []
    for d in sorted(days):                       # test-only made-up labels
        for hid, r in days[d].items():
            labels.append({"date": d, "hotspot_id": hid, "flooded": r["rain_24h"] >= 40, "sources": ["report"]})
    st = train.train(labels)
    assert st["status"] == "trained"
    assert st["model"]["recall"] is not None and st["rules_baseline"]["recall"] is not None
    assert ml.available()

    from model.simulate import run_storm
    wet = run_storm(120, 30, 40)
    w = next(h for h in wet["hotspots"] if h["scored"])["windows"]["next_24h"]
    assert 0 <= w["ml"]["probability"] <= 1 and 1 <= len(w["ml"]["drivers"]) <= 3
    dry = run_storm(0, 0, 0)
    w_dry = next(h for h in dry["hotspots"] if h["scored"])["windows"]["next_24h"]
    assert w_dry["ml"]["probability"] < w["ml"]["probability"]
