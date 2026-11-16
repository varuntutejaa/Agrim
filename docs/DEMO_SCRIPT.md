# 3-minute demo script (and backup video)

A click path you can record once as a backup video and follow live on 8 Dec.
Every number said aloud is on screen at that moment, or cited on the Data
and Sources pages. Times are cumulative.

## Before you record (10 minutes ahead)

- [ ] Open https://agrim-api.onrender.com/health and wait for `"ok": true` (up to a minute if it was asleep).
- [ ] Open https://agrim-two.vercel.app in a clean browser window, 1440 px wide (or full-screen on a laptop). No banner should show; if "Connecting to the live server" shows, wait for it to go.
- [ ] Check the top-right label. "Updated …" without "old" means the forecast is fresh. If it says "old", run **Actions → Forecast → Run workflow** on GitHub and wait 5 minutes.
- [ ] MCG desk → **Exercise** → type an officer name → **Reset drill**. (Drills are logged separately and never touch live data.)
- [ ] Simulator: it opens on **Once a monsoon** (40 mm), **Whole city**, nothing blocked.
- [ ] Screen recorder: full window, microphone on. Phone in reach if you want the Hindi shot.

## 0:00–0:20 · The problem (Home)

*Screen: Home, the forecast board.*

> "IMD forecasts rain. Nobody forecasts which junction floods. MCG already
> watches 155 waterlogging points, but learns which ones flooded after the
> water arrives. Agrim says which hotspots will flood in the next 24 to 48
> hours, how sure it is, and what each crew should do first."

**Click: See today's forecast.**

## 0:20–0:45 · The live forecast (Forecast)

- Point at the headline and counts.
  > "This is today's live forecast from three weather models."
  If everything is Low (likely in the dry season), say so:
  > "It's dry today, so every hotspot is Low. That's the right answer; let's make it rain."
- Point at the three dots on a row.
  > "The dots show how many of the three models agree. It's agreement, not a probability."
- **Click: Hero Honda Chowk** (row 01).
  > "Every call comes with reasons: it sits 2.4 m below its surroundings, level with the drain line, 92% built over."
- **Click: हिं**, then **EN** again.
  > "The public page is in Hindi and English."

## 0:45–1:45 · The simulator (Exercise band on screen)

**Click: Simulator.** It opens on **Once a monsoon**, 40 mm.

1. Point at the counts: **0 High, 12 Medium, 7 Low**.
   > "A normal heavy day: plenty of Medium, nothing High."
2. **Block a drain → tick Hero Honda Chowk outfall.** Counts change to **6 High, 9 Medium, 4 Low**; red flow lines run into Hero Honda Chowk.
   > "Same rain, one outfall choked with silt. The six hotspots whose water
   > passes through it, Hero Honda Chowk plus Rajiv Chowk, Sushant Lok,
   > Sector 39, Islampur and Civil Lines, go to High. That's why the order of
   > desilting matters."
3. Leave the outfall blocked (the desk drill uses this storm).
4. **Click: Drainage → Critical points.**
   > "Hero Honda Chowk outfall serves 6 of our 19 mapped hotspots. Four
   > outfalls serve 63% of them, eight serve 84%. Fix those first."

## 1:45–2:30 · The MCG desk (Exercise)

**Click: MCG desk.** It should already be on **Exercise** with your name in.

- Point at the headline and the **SOP timeline**: T-24 orders, T-12 gullies and pumps, T-3 pump test, T+24 report.
- **Tick: Gullies cleared** on Hero Honda Chowk; the timeline moves.
- **Click: Override** on one row, set **Medium**, reason "Pump already on site, checked at 5 pm". Save.
  > "Every change is logged with who, why and when, and the model's call stays beside it."
- **Click: Orders → Crew SMS.**
  > "One SMS per crew, under 160 characters."
- **Citizen alerts**: point at the Hindi and English text.
  > "Hindi first, then English. Nothing is sent without an officer's approval,
  > and in this demo nothing leaves the server."

## 2:30–2:50 · Honest about the data

**Click: About → Data & assumptions.**

> "Agrim runs on public data today: 21 hotspots listed, 19 on the map, out of
> MCG's 159. In an early check on 39 news reports of past floods, which we
> haven't finished reviewing, the rules flagged 12. The misses were days the
> weather model saw far less rain than was reported on the ground. That's why
> our first ask to MCG is rain-gauge data, and why we propose 25 gauges."

## 2:50–3:00 · Close

> "Agrim runs on public data today and plugs in MCG's own data the day it's
> shared: a ranked list 24 hours early, SOP orders per zone, and a scorecard
> that shows whether it worked."

## After recording

MCG desk → **Exercise** → **Reset drill**, and untick the blocked outfall in the Simulator.

## If something breaks live

| Problem | Do this |
|---|---|
| "Connecting to the live server" banner | Keep talking; the pages show the stored copy (labelled) and switch to live data within a minute |
| Map tiles don't load | Talk over the panel side (headline, counts, list); the story still holds |
| Wi-Fi down | Play the backup video |
