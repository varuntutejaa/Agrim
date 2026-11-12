"""Backtest: run the rules on past days and compare with what really happened.

Public numbers use REVIEWED labels only (data/incidents.csv: sourced reports
the team checked, plus imported MCG records). Unreviewed news candidates are
never published; the team can preview them locally:

    python -m model.backtest              # reviewed labels (what the app shows)
    python -m model.backtest --candidates # private preview of the unreviewed candidates

For each labelled hotspot-day the record's rain for that day is scored with
the same rules as the live forecast, then:
  caught       flooded, and Agrim would have said Red or Amber
  missed       flooded, and Agrim would have said Green
  false alarm  stayed clear, and Agrim would have said Red or Amber
  correct      stayed clear, and Agrim said Green

Each miss gets a reason computed from how unusual the MODEL's rain was that
day at that spot (its own 2018-2026 record), not guessed:
  model saw little rain    below the spot's 90th percentile
  model saw moderate rain  90th-99th percentile: wet, but nowhere near an extreme day
  model saw extreme rain   above the 99th percentile, yet the spot still scored
                           under the line: a genuine weakness of the rules there
The first two are the forecast model under-reading the storm, which is
typical of short, local cloudbursts that 9-25 km weather models smooth out.
"""
import argparse
import csv
from collections import defaultdict
from datetime import date

from model import rules
from model.features import past_day_rain, record_covers
from pipeline.config import DATA_DIR, INCIDENTS_CSV

CANDIDATES_CSV = DATA_DIR / "incidents_candidates.csv"


def _labels(candidates: bool) -> list[dict]:
    path = CANDIDATES_CSV if candidates else INCIDENTS_CSV
    with open(path, newline="") as f:
        rows = [r for r in csv.DictReader(f) if r.get("flooded") in ("yes", "no")]
    seen, out = set(), []
    for r in rows:           # one label per hotspot and day (any "yes" wins)
        key = (r["date"], r["hotspot_id"])
        if key in seen:
            if r["flooded"] == "yes":
                next(o for o in out if (o["date"], o["hotspot_id"]) == key)["flooded"] = "yes"
            continue
        seen.add(key)
        out.append({"date": r["date"], "hotspot_id": r["hotspot_id"], "flooded": r["flooded"],
                    "source_url": r.get("source_url", ""), "evidence": r.get("evidence", "")})
    return out


def run(candidates: bool = False) -> dict:
    from model.run_forecast import load_static
    from model.simulate import _replay_days
    terrain, clim, hotspots = load_static()
    days = _replay_days()
    record = set(days)

    rows, skipped = [], defaultdict(int)
    for lab in _labels(candidates):
        hid, d = lab["hotspot_id"], date.fromisoformat(lab["date"])
        if hid not in terrain:
            skipped["no map pin yet"] += 1
            continue
        if not record_covers(d, record):
            skipped["outside the 2018–2026 monsoon record"] += 1
            continue
        rain = past_day_rain(days.get(lab["date"]), hid, terrain[hid]["upstream_ids"])
        a = rules.assess(rain, terrain[hid], clim[hid], hotspots[hid])
        flooded = lab["flooded"] == "yes"
        alarm = a["level"] in ("red", "amber")
        outcome = ("caught" if alarm else "missed") if flooded else ("false alarm" if alarm else "correct")
        e = rules.exceedance(rain["rain_24h"], clim[hid], "rain_24h")
        reason = None
        if outcome == "missed":
            reason = ("model saw little rain" if e < 1.0 else
                      "model saw moderate rain" if e < 2.0 else "model saw extreme rain")
        rows.append({
            "date": lab["date"], "hotspot_id": hid, "name": hotspots[hid]["name"], "flooded": flooded,
            "level": a["level"], "score": a["score"], "outcome": outcome, "reason": reason,
            "model_rain_mm": round(rain["rain_24h"], 1), "model_peak_mm": round(rain["peak1h"], 1),
            "how_unusual": rules.how_often(e), "source_url": lab["source_url"],
        })

    count = lambda o: sum(r["outcome"] == o for r in rows)
    by_day = defaultdict(lambda: {"caught": 0, "missed": 0, "false alarm": 0, "correct": 0, "rain": []})
    for r in rows:
        by_day[r["date"]][r["outcome"]] += 1
        by_day[r["date"]]["rain"].append(r["model_rain_mm"])
    days_out = [{"date": d, **{k: v for k, v in x.items() if k != "rain"},
                 "model_rain_min": min(x["rain"]), "model_rain_max": max(x["rain"])}
                for d, x in sorted(by_day.items())]
    floods = count("caught") + count("missed")
    return {
        "reviewed_only": not candidates,
        "n": len(rows),
        "counts": {o: count(o) for o in ("caught", "missed", "false alarm", "correct")},
        "catch_rate": round(count("caught") / floods, 3) if floods else None,
        "miss_reasons": {r: sum(x["reason"] == r for x in rows)
                         for r in ("model saw little rain", "model saw moderate rain", "model saw extreme rain")},
        "skipped": dict(skipped),
        "days": days_out,
        "rows": rows,
        "note": ("Rules re-run on the ECMWF record for each labelled day. Model rain is not gauge rain; "
                 "misses where the model saw little or moderate rain are typical of short cloudbursts."),
    }


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--candidates", action="store_true", help="private preview of unreviewed news candidates")
    out = run(candidates=p.parse_args().candidates)
    tag = "UNREVIEWED CANDIDATES (do not publish)" if not out["reviewed_only"] else "reviewed labels"
    c = out["counts"]
    print(f"Backtest on {out['n']} {tag}: caught {c['caught']}, missed {c['missed']}, "
          f"false alarms {c['false alarm']}, correct {c['correct']}. Skipped: {out['skipped'] or 'none'}")
    print("Miss reasons:", out["miss_reasons"])
    for d in out["days"]:
        print(f"  {d['date']}: model rain {d['model_rain_min']:.0f}–{d['model_rain_max']:.0f} mm → caught {d['caught']}, missed {d['missed']}")


if __name__ == "__main__":
    main()
