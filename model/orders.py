"""SMS-style orders for MCG zones, written so crews can act without explanation.

Deadlines follow the SOP, counted back from when the rain is expected:
  T-12 h  clear gullies; move the pump (Red) or put one on standby (Amber)
  T-3 h   test the pump on site (Red)
  T+24 h  report back: flooded? how deep? how long?
"When the rain is expected" = the start of that hotspot's wettest hours in
the forecast. A simulated (exercise) storm has no clock, so it is treated as
arriving 24 h after the orders are issued: a standard T-24 drill.

Two outputs: one order sheet per zone, and one short SMS (<= 160 characters)
per Red/Amber hotspot for the crew on that spot.
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from pipeline.config import TIMEZONE

IST = ZoneInfo(TIMEZONE)
UNASSIGNED = "Unassigned"
EXERCISE_LEAD_H = 24


def zone_of(h: dict) -> str:
    return (h.get("zone") or "").strip() or UNASSIGNED


def _t(dt: datetime) -> str:
    """'1 AM Mon 9 Nov'."""
    return dt.strftime("%-I %p %a %-d %b").replace("AM", "am").replace("PM", "pm")


def _short(dt: datetime) -> str:
    """'01:00 Mon' for SMS."""
    return dt.strftime("%H:%M %a")


def _onset(w: dict, window_start: datetime, issued: datetime, exercise: bool) -> datetime:
    if exercise:
        return issued.replace(minute=0) + timedelta(hours=EXERCISE_LEAD_H)
    ww = w["rain"].get("wet_window")
    if ww:
        return datetime.fromisoformat(ww["start"]).replace(tzinfo=IST)
    return window_start


def _deadline(t: datetime, issued: datetime) -> str:
    return "NOW" if t <= issued else _t(t)


def build_orders(result: dict, zone: str = "all", window: str = "next_24h", exercise: bool = False) -> dict:
    issued = datetime.now(IST).replace(second=0, microsecond=0)
    win_meta = result["meta"].get("windows", {}).get(window)
    window_start = datetime.fromisoformat(win_meta["start"]).replace(tzinfo=IST) if win_meta else issued

    scored = [h for h in result["hotspots"] if h["scored"]]
    in_zone = [h for h in scored if zone == "all" or zone_of(h) == zone]
    at_risk = [h for h in in_zone if h["windows"][window]["level"] in ("red", "amber")]

    items, sms = [], []
    for h in at_risk:
        w = h["windows"][window]
        onset = _onset(w, window_start, issued, exercise)
        t12, t3, t24 = onset - timedelta(hours=12), onset - timedelta(hours=3), onset + timedelta(hours=24)
        items.append({
            "hotspot_id": h["id"], "name": h["name"], "zone": zone_of(h), "level": w["level"],
            "onset": onset.isoformat(), "t12": t12.isoformat(), "t3": t3.isoformat(), "t24": t24.isoformat(),
            "overridden": "override" in w,
        })
        tag = "EXERCISE " if exercise else ""
        if w["level"] == "red":
            text = (f"{tag}AGRIM RED {h['name']}: pump + clear gullies by {'NOW' if t12 <= issued else _short(t12)}, "
                    f"test pump {_short(t3)}. Rain from {_short(onset)}.")
        else:
            text = (f"{tag}AGRIM AMBER {h['name']}: clear gullies by {'NOW' if t12 <= issued else _short(t12)}, "
                    f"pump on standby. Rain from {_short(onset)}.")
        sms.append({"hotspot_id": h["id"], "level": w["level"], "text": text[:160]})

    # Order sheet.
    zone_label = "all zones" if zone == "all" else f"zone {zone}" if zone != UNASSIGNED else "hotspots without a zone"
    head = f"{'[EXERCISE] ' if exercise else ''}AGRIM ORDERS, {zone_label}. Issued {_t(issued)}."
    lines = [head]
    reds = [i for i in items if i["level"] == "red"]
    ambers = [i for i in items if i["level"] == "amber"]
    if not items:
        lines.append(f"No pump moves needed. All {len(in_zone)} hotspots low risk.")
    if reds:
        lines.append(f"\nRED, flooding likely ({len(reds)}):")
        for n, i in enumerate(reds, 1):
            t12, t3 = datetime.fromisoformat(i["t12"]), datetime.fromisoformat(i["t3"])
            lines.append(f"{n}. {i['name']}: move pump and clear gullies by {_deadline(t12, issued)}. "
                         f"Test pump by {_deadline(t3, issued)}.")
    if ambers:
        lines.append(f"\nAMBER, flooding possible ({len(ambers)}):")
        for n, i in enumerate(ambers, 1):
            t12 = datetime.fromisoformat(i["t12"])
            lines.append(f"{n}. {i['name']}: clear gullies by {_deadline(t12, issued)}. Keep a pump on standby nearby.")
    if items:
        last = max(datetime.fromisoformat(i["t24"]) for i in items)
        lines.append(f"\nAfter the rain, report for each spot: flooded? depth? hours? By {_t(last)}.")

    return {
        "zone": zone, "window": window, "exercise": exercise, "issued_at": issued.isoformat(),
        "counts": {"red": len(reds), "amber": len(ambers), "green": len(in_zone) - len(items)},
        "text": "\n".join(lines), "items": items, "sms": sms,
        "zones": sorted({zone_of(h) for h in scored}),
    }
