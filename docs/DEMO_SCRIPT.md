# 3-minute demo script

One presenter drives, one speaks. Every number said aloud is on screen or in
docs/SOURCES.md. Times are cumulative.

## Before you start (5 minutes ahead)

- [ ] Open the API URL `/health` 2 minutes before. The free Render instance sleeps and needs 30–60 s to wake.
- [ ] Open the app on the laptop **and** on a phone (Forecast view).
- [ ] MCG desk: enter an officer name, switch to **Exercise**, click **Reset drill**.
- [ ] Simulator: Design a storm, **Once a decade** preset, **Whole city**.
- [ ] Have the screenshots in `docs/` ready in case the venue Wi-Fi drops.

## 0:00–0:20 · The problem

> "IMD forecasts rain. Nobody forecasts **which junction** floods. MCG already
> watches 155 waterlogging points round the clock, but it learns which ones
> flooded after the water arrives. Agrim tells MCG which hotspots will flood
> in the next 24–48 hours, how sure we are, and exactly what each crew should do."

*Screen: Forecast view.*

## 0:20–0:45 · The public view (real forecast)

- Point at the headline: today's **live** forecast from three weather models.
- Tap **हिं**: the same page in Hindi. "Citizens get plain words: which roads to avoid, and when."
- Tap a hotspot (Hero Honda Chowk): "Every call has three reasons: it sits 2.4 m below its surroundings, level with the drain line, 92% built over."

## 0:45–1:40 · The simulator (EXERCISE band visible)

1. **Simulator → Once a decade** (90 mm): the map turns red; red flow paths move.
   > "Risk travels downstream: water from Sushant Lok, Rajiv Chowk and three
   > others ends up at Hero Honda Chowk. That's why it floods first."
2. **Local storm**, then tap near Hero Honda Chowk:
   > "Rain is uneven. A storm here turns these junctions red and leaves the
   > rest of the city green."
3. **Replay a day → 19 Jul 2021**, the wettest day in the 2018–2026 record:
   > "Same rules on a real past day."

## 1:40–2:25 · The MCG desk (Exercise)

- Headline: "*N* hotspots to prepare by *T-12 time*." Point at the **SOP timeline**: T-24 orders, T-12 gullies and pumps, T-3 pump test, T+24 report.
- Tick **Gullies cleared** on one row; the timeline moves.
- **Override** one hotspot to Amber with a reason ("pump already on site"). It's logged with the officer's name, and the model's call is kept beside it.
- **Orders → Crew SMS**: "One SMS per crew, under 160 characters."
- **Citizen alerts → Approve and send**: "Hindi then English. The channel is the console: nothing leaves the server in a demo."

## 2:25–2:50 · Honest about the data

- **Drainage** tab: "Computed from 30 m terrain and mapped drains. The Centre's Lok Sabha reply describes the same gradient: Aravallis to the Najafgarh drain."
- **Data** tab:
  > "We checked the rules against 39 flood reports from the news. They caught 12.
  > Every miss was a cloudburst the forecast model under-read. That's why our
  > first ask to MCG is rain-gauge data. The machine-learning model is built and
  > waiting for MCG's post-storm records. We won't train it on made-up floods."

## 2:50–3:00 · Close

> "Agrim runs on public data today, and it's built to plug in MCG's own data
> the day it's shared. What MCG gets: a ranked list 24 hours early, SOP orders
> per zone, and a scorecard that shows whether it worked."

## If something breaks

| Problem | Do this |
|---|---|
| API asleep / slow | Keep talking over the Forecast view; it loads from the cached result once awake |
| Map tiles don't load | Show the panel side (headline, counts, list); the story still holds |
| Wi-Fi down | Screenshots in `docs/` |
