# MCG pre-event checklist

How the **MCG desk** tab maps to the monsoon SOP. Timings come from the
project brief; check them against MCG's own monsoon SOP and edit
`model/orders.py` if they differ.

| When | Step | Who | In Agrim |
|------|------|-----|----------|
| T-24 h | Ranked Red/Amber list issued per zone | Zone control room | Order sheet and crew SMS (copy); "Mark orders as issued" |
| T-12 h | Clear gullies at Red and Amber spots; move a pump to each Red spot, put one on standby for Amber | Zone JE + crews | "Gullies cleared", "Pump placed / on standby" ticks |
| T-3 h | Test each pump on site; confirm diesel and operator | Pump operators | "Pump tested" tick (Red spots) |
| T 0 | Rain expected | – | Start of the hotspot's wettest forecast hours |
| T+24 h | Report each spot: flooded? depth? hours? | Zone JE | "Report" form, stored as feedback |

**When is T 0?** For the live forecast, it's the start of each hotspot's
wettest hours (hours with at least half the peak rate). For an exercise,
the storm is treated as arriving 24 h after the orders are issued, a
standard T-24 drill. If a deadline has already passed, the orders say **NOW**.

**Overrides.** An officer who knows something the model doesn't (drain just
desilted, pump already on site, a blockage seen) can set a hotspot to
Red/Amber/Green. This needs their name and a reason of at least 10 characters,
and lasts 6–72 h. The change shows everywhere, including the public map,
with the model's original call alongside. Every override is logged and can be
cancelled. Exercise overrides never affect the live forecast.

**Feedback.** Reports are stored with the level Agrim showed for that
hotspot and day. They're the ground truth for the scorecard (milestone 7)
and for training the model (milestone 6).

**Storage.** Neon Postgres (`DATABASE_URL` in `.env`); tables are created
automatically on first use (`api/db.py`). Optional `OPS_TOKEN` adds a desk
code for officer actions.
