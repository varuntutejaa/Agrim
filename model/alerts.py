"""Citizen alerts in plain English and Hindi, and a mock voice-call (IVR) script.

  citizen_items()  Red and Amber hotspots with "when" and "what to do", for the
                   public "roads to avoid" list
  alert_for()      SMS text (English + Hindi) and an IVR script for a Red hotspot

Wording rules: short, no jargon, a time window people can act on, and a
practical tip where the team has one (data/hotspot_tips.csv, each with its
source). Messages say "Agrim pilot" and never claim to be from MCG, and
exercise messages are marked EXERCISE / अभ्यास.
"""
import csv
from datetime import datetime, timedelta
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from pipeline.config import DATA_DIR, TIMEZONE

IST = ZoneInfo(TIMEZONE)
TIPS_CSV = DATA_DIR / "hotspot_tips.csv"
GENERIC_TIP = ("Avoid this stretch if you can, or allow extra time.", "हो सके तो इस रास्ते से बचें, या ज़्यादा समय लेकर चलें।")


def _tips() -> dict:
    if not TIPS_CSV.exists():
        return {}
    with TIPS_CSV.open(newline="") as f:
        return {r["id"]: (r["tip_en"], r["tip_hi"]) for r in csv.DictReader(f)}


def _part_of_day(hour: int) -> tuple[str, str]:
    if 5 <= hour < 12:
        return "morning", "सुबह"
    if 12 <= hour < 16:
        return "afternoon", "दोपहर"
    if 16 <= hour < 20:
        return "evening", "शाम"
    return "night", "रात"


def _clock(dt: datetime) -> str:
    return f"{dt.hour % 12 or 12}"


def when_phrase(w: dict, now: datetime, exercise: bool) -> tuple[str, str]:
    """('6–10 pm today', 'आज शाम 6–10 बजे'), from the hotspot's wettest hours."""
    ww = w["rain"].get("wet_window")
    if exercise or not ww:
        return "in the next 24 hours", "अगले 24 घंटों में"
    start = datetime.fromisoformat(ww["start"]).replace(tzinfo=IST)
    end = datetime.fromisoformat(ww["end"]).replace(tzinfo=IST)
    day_offset = (start.date() - now.date()).days
    day_en = {0: "today", 1: "tomorrow"}.get(day_offset, start.strftime("%a %-d %b"))
    day_hi = {0: "आज", 1: "कल"}.get(day_offset, start.strftime("%-d/%-m"))
    span = end - start
    if span >= timedelta(hours=12):
        return f"through {day_en}", f"{day_hi} दिन भर"
    _, part_hi = _part_of_day(start.hour)
    ampm = start.strftime("%p").lower()
    return (f"{_clock(start)}–{_clock(end)} {ampm} {day_en}",
            f"{day_hi} {part_hi} {_clock(start)}–{_clock(end)} बजे")


def citizen_items(result: dict, window: str = "next_24h", exercise: bool = False) -> list[dict]:
    """Red and Amber hotspots with time and tip, in both languages, Red first."""
    now = datetime.now(IST)
    tips = _tips()
    items = []
    for h in result["hotspots"]:
        if not h["scored"]:
            continue
        w = h["windows"][window]
        if w["level"] not in ("red", "amber"):
            continue
        when_en, when_hi = when_phrase(w, now, exercise)
        tip_en, tip_hi = tips.get(h["id"], GENERIC_TIP)
        items.append({"hotspot_id": h["id"], "name": h["name"], "level": w["level"],
                      "when_en": when_en, "when_hi": when_hi, "tip_en": tip_en, "tip_hi": tip_hi,
                      "tip_sourced": h["id"] in tips})
    items.sort(key=lambda i: i["level"] != "red")
    return items


def alert_for(item: dict, exercise: bool = False) -> dict:
    """SMS text in English and Hindi, plus a mock IVR script (TwiML-style XML, no call is placed)."""
    tag_en, tag_hi = ("EXERCISE: ", "अभ्यास: ") if exercise else ("", "")
    en = (f"{tag_en}Agrim pilot: Waterlogging likely at {item['name']}, {item['when_en']}. "
          f"{item['tip_en']}")
    hi = (f"{tag_hi}Agrim पायलट: {item['name']} पर जलभराव की संभावना, {item['when_hi']}। "
          f"{item['tip_hi']}")
    ivr = ("<Response>"
           f'<Say language="hi-IN">{escape(hi)}</Say><Pause length="1"/>'
           f'<Say language="en-IN">{escape(en)}</Say><Pause length="1"/>'
           f'<Say language="hi-IN">{escape(hi)}</Say>'
           "</Response>")
    return {"hotspot_id": item["hotspot_id"], "name": item["name"], "level": item["level"],
            "sms_en": en, "sms_hi": hi, "ivr": ivr}
