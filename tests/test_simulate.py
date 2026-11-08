"""Simulator checks: same rules, marked as an exercise, rain behaves sensibly.

Uses the committed tables (data/network, data/model). Run:  python -m pytest -q
"""
import pytest

from model import simulate


def levels(result):
    return {h["id"]: h["windows"]["next_24h"]["level"] for h in result["hotspots"] if h["scored"]}


def test_always_marked_as_exercise():
    r = simulate.run_storm(50, 10, 10)
    assert r["meta"]["is_simulation"] is True
    assert "EXERCISE" in r["meta"]["exercise_label"]


def test_no_rain_means_all_green():
    assert set(levels(simulate.run_storm(0, 0, 0)).values()) == {"green"}


def test_more_rain_never_lowers_risk():
    rank = {"green": 0, "amber": 1, "red": 2}
    light, heavy = levels(simulate.run_storm(30, 8, 10)), levels(simulate.run_storm(120, 30, 10))
    assert all(rank[heavy[h]] >= rank[light[h]] for h in light)


def test_local_storm_spares_far_hotspots():
    # A small storm far south of the city (outside it) leaves the city mostly dry.
    far = simulate.run_storm(150, 40, 20, centre=(77.05, 28.20), radius_km=3)
    city = simulate.run_storm(150, 40, 20)
    assert far["meta"]["counts"]["next_24h"]["red"] < city["meta"]["counts"]["next_24h"]["red"]


def test_peak_hour_cannot_exceed_day_total():
    r = simulate.run_storm(10, 50, 0)
    assert r["meta"]["params"]["peak1h"] == 10


def test_replay_known_and_unknown_days():
    r = simulate.run_replay("2021-07-19")
    assert r["meta"]["mode"] == "replay" and r["meta"]["event"]["source"] == "model record"
    with pytest.raises(ValueError):
        simulate.run_replay("2019-01-01")
