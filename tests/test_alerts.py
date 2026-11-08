"""Alert checks: plain-language timing, exercise labels, safe sending, logging."""
from datetime import datetime

from api import notify
from model import alerts
from model.simulate import run_storm

IST = alerts.IST


def w_with(start, end):
    return {"rain": {"wet_window": {"start": start, "end": end}}}


def test_when_phrase_today_evening():
    now = datetime(2026, 7, 31, 9, 0, tzinfo=IST)
    en, hi = alerts.when_phrase(w_with("2026-07-31T18:00:00", "2026-07-31T22:00:00"), now, exercise=False)
    assert en == "6–10 pm today" and hi == "आज शाम 6–10 बजे"


def test_when_phrase_tomorrow_and_exercise():
    now = datetime(2026, 7, 31, 23, 0, tzinfo=IST)
    en, _ = alerts.when_phrase(w_with("2026-08-01T06:00:00", "2026-08-01T09:00:00"), now, exercise=False)
    assert en.endswith("tomorrow")
    en_x, hi_x = alerts.when_phrase(w_with("2026-08-01T06:00:00", "2026-08-01T09:00:00"), now, exercise=True)
    assert en_x == "in the next 24 hours" and "24" in hi_x


def test_exercise_alerts_are_marked_and_red_only():
    items = alerts.citizen_items(run_storm(120, 30, 40), exercise=True)
    reds = [alerts.alert_for(i, exercise=True) for i in items if i["level"] == "red"]
    assert reds and all(a["sms_en"].startswith("EXERCISE") and a["sms_hi"].startswith("अभ्यास") for a in reds)
    assert all("<Response>" in a["ivr"] for a in reds)
    assert "MCG" not in reds[0]["sms_en"]   # never claims to be from MCG


def test_sourced_tip_used_where_available():
    tips = alerts._tips()
    assert "H001" in tips and "NH-48" in tips["H001"][0]


def test_twilio_refuses_without_test_numbers(monkeypatch):
    monkeypatch.setenv("ALERT_CHANNEL", "twilio")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "ACtest")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "x")
    monkeypatch.setenv("TWILIO_FROM", "+10000000000")
    monkeypatch.setenv("ALERT_TEST_NUMBERS", "")
    assert notify.send("hello")[0]["status"] == "refused"


def test_console_is_default_and_masks(monkeypatch):
    monkeypatch.delenv("ALERT_CHANNEL", raising=False)
    assert notify.send("hello")[0]["status"] == "logged"
    assert notify.mask("+91 98765 43210") == "•••• 3210"


def test_alert_log_and_scorecard(ops_db):
    ops_db.log_alerts("Asha", True, [{"hotspot_id": "H002", "level": "red", "channel": "console", "to": "server log",
                                      "status": "logged", "detail": None, "sms_en": "x", "sms_hi": "y"}])
    assert ops_db.alert_log()[0]["officer"] == "Asha"
    card = ops_db.scorecard()
    assert card["counts"] == {"hits": 0, "misses": 0, "false_alarms": 0, "correct_clear": 0}
