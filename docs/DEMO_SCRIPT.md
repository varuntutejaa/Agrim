# 3-minute demo script

One presenter drives, one speaks. Every number said aloud is on screen or in
docs/SOURCES.md. Times are cumulative.

## Before you start (5 minutes ahead)

- [ ] App: https://agrim-two.vercel.app · API: https://agrim-api.onrender.com
- [ ] Open the API URL `/health` 2 minutes before. During the day (until 30 Nov) a scheduled ping keeps it awake; otherwise the free Render instance sleeps and needs 30–60 s to wake.
- [ ] Check the masthead's "Updated" time. If it shows "· old" (over 12 h), the forecast refresh has stalled: run the **Refresh forecast** workflow on GitHub (Actions tab).
- [ ] Open the app on the laptop (landing page) **and** on a phone (Forecast view).
- [ ] MCG desk: enter an officer name, switch to **Exercise**, click **Reset drill**.
- [ ] Simulator: Design a storm, **Once a decade** preset, **Whole city**.
- [ ] Have `docs/screenshots/` open in case the venue Wi-Fi drops (forecast, simulator, replay, local storm, drainage, MCG desk, citizen alerts, data, Hindi on a phone).

## 0:00–0:20 · The problem

> "IMD forecasts rain. Nobody forecasts **which junction** floods. MCG already
> watches 155 waterlogging points round the clock, but it learns which ones
> flooded after the water arrives. Agrim tells MCG which hotspots will flood
> in the next 24–48 hours, how sure we are, and exactly what each crew should do."

*Screen: landing page (one screen: the promise, today's counts, three ways in). Click **See today's forecast**.*

## 0:20–0:45 · The public view (real forecast)

- Point at the headline: today's **live** forecast from three weather models.
- Point at the three squares on a row: "Confidence is how many of the three models agree. All three: flooding likely. One or two: possible."
- Tap **हिं**: the same page in Hindi. "Citizens get plain words: which roads to avoid, and when."
- Tap a hotspot (Hero Honda Chowk): "Every call has three reasons: it sits 2.4 m below its surroundings, level with the drain line, 92% built over."

## 0:45–1:40 · The simulator (EXERCISE band visible)

1. **Simulator → Once a decade** (90 mm): the map turns red; red flow paths move.
   > "Risk travels downstream: water from Sushant Lok, Rajiv Chowk and three
   > others ends up at Hero Honda Chowk. That's why it floods first."
2. **Once a monsoon** (40 mm): mostly amber. Then **Block a drain → Hero Honda Chowk outfall**:
   > "Same rain, one drain choked with silt. Six hotspots that drain through it
   > turn red. This is why desilting order matters."
3. **Drainage → Critical points**:
   > "One outfall serves 6 of our 19 hotspots. Eight outfalls cover 84%. Fix those first."
4. *(If time)* **Replay a day → 19 Jul 2021**, the wettest day in the 2018–2026 record:
   > "Same rules on a real past day."

## 1:40–2:25 · The MCG desk (Exercise)

- Headline: "*N* hotspots to prepare by *T-12 time*." Point at the **SOP timeline**: T-24 orders, T-12 gullies and pumps, T-3 pump test, T+24 report.
- Tick **Gullies cleared** on one row; the timeline moves.
- **Override** one hotspot to Amber with a reason ("pump already on site"). It's logged with the officer's name, and the model's call is kept beside it.
- **Orders → Crew SMS**: "One SMS per crew, under 160 characters."
- **Citizen alerts → Approve and send**: "Hindi then English. The channel is the console: nothing leaves the server in a demo."

## 2:25–2:50 · Honest about the data

- **Drainage** tab: "Computed from 30 m terrain and mapped drains. The Centre's Lok Sabha reply describes the same gradient: Aravallis to the Najafgarh drain."
- **About → Backtest** (published once the 48 news reports are reviewed; until then use the numbers below, and say they're unreviewed):
  > "We checked the rules against 39 flood reports from the news. They caught 12.
  > Every miss was a day the forecast model saw little or moderate rain: a
  > cloudburst it under-read. That's why our first ask to MCG is rain-gauge
  > data. The machine-learning model is built and waiting for MCG's
  > post-storm records. We won't train it on made-up floods."
- One line on coverage: "21 of MCG's 159 hotspots are mapped, from public reports. The full list needs MCG data."

## 2:50–3:00 · Close

> "Agrim runs on public data today, and it's built to plug in MCG's own data
> the day it's shared. What MCG gets: a ranked list 24 hours early, SOP orders
> per zone, and a scorecard that shows whether it worked."

## If something breaks

| Problem | Do this |
|---|---|
| API asleep / slow | Keep talking over the Forecast view; it loads from the cached result once awake |
| Map tiles don't load | Show the panel side (headline, counts, list); the story still holds |
| Wi-Fi down | `docs/screenshots/` |
