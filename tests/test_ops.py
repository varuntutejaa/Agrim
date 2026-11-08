"""MCG desk checks.

Orders need no database. The override/feedback/checklist tests run against
the Neon database in DATABASE_URL, inside a throwaway schema that is dropped
afterwards, so the real tables are never touched. They are skipped if
DATABASE_URL is not set.
"""
import os
import uuid

import pytest

from model.orders import build_orders
from model.simulate import run_storm

KNOWN = {"H002", "H003"}


def test_orders_dry_day_says_no_action():
    o = build_orders(run_storm(0, 0, 0), exercise=True)
    assert o["items"] == [] and "No pump moves needed" in o["text"]


def test_orders_storm_lists_red_first_with_deadlines():
    o = build_orders(run_storm(120, 30, 40), exercise=True)
    assert o["text"].startswith("[EXERCISE]")
    assert o["items"] and all(i["t12"] < i["t3"] < i["onset"] < i["t24"] for i in o["items"])
    assert all(len(s["text"]) <= 160 for s in o["sms"])


def test_orders_filter_by_zone():
    o = build_orders(run_storm(120, 30, 40), zone="Nowhere", exercise=True)
    assert o["items"] == []


@pytest.fixture()
def ops_db(monkeypatch):
    from api import db
    if not db.configured():
        pytest.skip("DATABASE_URL not set")
    schema = f"test_{uuid.uuid4().hex[:10]}"
    monkeypatch.setenv("AGRIM_DB_SCHEMA", schema)
    db.close()
    from api import ops
    ops._forget_active()
    yield ops
    ops._forget_active()
    with db.connect() as conn:
        conn.execute(f"DROP SCHEMA {schema} CASCADE")
    db.close()
    os.environ.pop("AGRIM_DB_SCHEMA", None)


def test_override_applies_and_revokes(ops_db):
    ops = ops_db
    result = run_storm(0, 0, 0)          # all green
    o = ops.create_override("Asha", "H002", "red", "Drain blocked, seen on site", 24, True, "green", "exercise", KNOWN)
    applied = ops.apply_overrides(run_storm(0, 0, 0), is_exercise=True)
    h = next(x for x in applied["hotspots"] if x["id"] == "H002")
    assert h["windows"]["next_24h"]["level"] == "red" and h["windows"]["next_24h"]["model_level"] == "green"
    assert applied["meta"]["counts"]["next_24h"]["red"] == result["meta"]["counts"]["next_24h"]["red"] + 1
    # Exercise overrides never touch live results.
    live = ops.apply_overrides(run_storm(0, 0, 0), is_exercise=False)
    assert next(x for x in live["hotspots"] if x["id"] == "H002")["windows"]["next_24h"]["level"] == "green"
    ops.revoke_override(o["id"], "Asha")
    again = ops.apply_overrides(run_storm(0, 0, 0), is_exercise=True)
    assert next(x for x in again["hotspots"] if x["id"] == "H002")["windows"]["next_24h"]["level"] == "green"


def test_override_needs_name_and_reason(ops_db):
    with pytest.raises(ops_db.OpsError):
        ops_db.create_override("A", "H002", "red", "short", 24, True, None, None, KNOWN)


def test_feedback_and_checklist(ops_db):
    f = ops_db.create_feedback("Asha", "H003", "2025-07-31", True, "knee", 3, "Pump arrived late", KNOWN)
    assert f["flooded"] is True and f["depth"] == "knee"
    with pytest.raises(ops_db.OpsError):
        ops_db.create_feedback("Asha", "H003", "2999-01-01", False, None, None, None, KNOWN)
    ops_db.set_check("exercise", "Unassigned", "H003", "pump_moved", True, "Asha")
    ops_db.set_check("exercise", "Unassigned", "H003", "pump_moved", False, "Ravi")   # upsert, not duplicate
    ticks = ops_db.checklist("exercise")
    assert len(ticks) == 1 and ticks[0]["done"] is False and ticks[0]["officer"] == "Ravi"
