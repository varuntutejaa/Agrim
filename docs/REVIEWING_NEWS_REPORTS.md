# Reviewing the 48 news reports (about 1 to 2 hours)

The backtest only publishes flood reports a person has checked. The 48
candidates come from **10 articles**, so you read 10 articles, not 48.

## 1. Open the sheet

`data/news_reports_review.csv` (made with
`python -m pipeline.review_candidates --export data/news_reports_review.csv`).
Open it in Excel, Numbers or Google Sheets. Rows are grouped by article.

## 2. For each article, open `source_url` once, then decide each of its rows

Write **accept** or **reject** in the `decision` column (leave it blank to
decide later). Use `note` for anything worth remembering.

Accept a row only if all three hold:

1. **Date.** The article says the flooding happened on the row's `date`.
   Articles are often published the next morning (e.g. an article dated
   20 Jul 2021 about rain on 19 Jul): that's fine if the text says when.
2. **Place.** The article names this spot (`hotspot_name`), not just
   "Gurugram" or a nearby area. `evidence` quotes the line we found.
3. **Flooding.** The article says water collected there (waterlogged,
   submerged, knee-deep, traffic stopped by water). A forecast, a warning or
   "rain lashed the city" is not enough.

Reject if any one fails. When unsure, leave it blank: a missing label is
better than a wrong one.

## 3. Save as CSV and import

```bash
python -m pipeline.review_candidates --import data/news_reports_review.csv --reviewer "Your Name" --dry-run
python -m pipeline.review_candidates --import data/news_reports_review.csv --reviewer "Your Name"
```

The dry run shows what would happen and saves nothing. The real import
adds accepted rows to `data/incidents.csv` (with the same checks as
`pipeline/add_incident.py`) and marks every decided row as accepted or
rejected, with your name.

## 4. Then

```bash
python -m model.backtest        # the reviewed result (what the Backtest page will show)
python -m pytest -q
```

Commit `data/incidents.csv` and `data/incidents_candidates.csv`, and
redeploy the API so the Backtest page shows the reviewed result. The
machine-learning model still needs dry cases ("rain fell, the spot stayed
clear"), which mostly come from officers' after-rain reports, so it will
stay untrained after this review.
