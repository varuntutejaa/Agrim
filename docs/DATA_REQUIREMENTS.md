# Data Agrim needs, and what it assumes

Agrim runs today on **public data only**. Where the Municipal Corporation of
Gurugram (MCG) or GMDA holds better data that isn't published, this document
does four things for each item:

- states what we assume;
- shows evidence that the data already exists;
- gives the format we'd accept;
- says what improves when it arrives and what Agrim does without it.

**Nothing in Agrim depends on data that doesn't or can't exist.** One item,
drain water-level sensors, doesn't exist yet. It is listed separately as an
optional proposal, and Agrim works without it (`drain_level_m` stays empty).

Checked 8 Nov 2026. All links are news reports or official statements.

---

## 1. What runs today on public data

| Capability | Public source | Where |
|---|---|---|
| Rain forecast, next 72 h, 3 models | Open-Meteo (ECMWF, GFS, ICON) | `pipeline/fetch_rain_forecast.py` |
| Each hotspot's rain record, 2018–2026 monsoons | Open-Meteo archive (ECMWF IFS, ERA5) | `pipeline/fetch_rain_history.py`, `model/climatology.py` |
| Terrain, drainage network, upstream areas | Copernicus DEM, OpenStreetMap drains, ESA WorldCover | `pipeline/build_network.py` |
| Hotspot list (21) and locations | News coverage + OpenStreetMap geocoding | `data/hotspots.csv` |
| Zones for 10 of the 21 hotspots | [Tribune, 31 Jul 2026](https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/) | `data/hotspots.csv` |
| Flood event dates (district level) | India Flood Inventory, CC-BY-4.0 | `pipeline/fetch_ifi.py` |
| 48 candidate flood reports (awaiting review) | News coverage, each with its link | `data/incidents_candidates.csv` |
| Red/Amber/Green risk, simulator, MCG desk, orders | All of the above | live at the API |

The drainage direction Agrim computes (from the Aravalli side north-west
toward the Najafgarh drain) matches what the Centre told the Lok Sabha: the
Aravallis lie east, the Najafgarh drain north-west, with about a 78 m drop
([Tribune, 8 Aug 2025](https://www.tribuneindia.com/news/haryana/natural-gradient-between-aravallis-najafgarh-drain-behind-ggram-flooding-centre-in-ls)).

---

## 2. Data we'd ask MCG / GMDA for

Each item has a header-only template in `data/templates/`. Items D1 and D2
can be imported today with `python -m pipeline.import_mcg`.

| # | Data | Evidence it exists | What it improves | Without it |
|---|---|---|---|---|
| **D1** | **Graded hotspot list**: name, zone, severity grade, coordinates, responsible officer | MCG lists 159 hotspots graded 4 extremely critical / 39 critical / 56 moderate / 60 low ([Tribune, 19 Apr 2026](https://www.tribuneindia.com/news/gurugram/gurugram-flags-159-waterlogging-hotspots-ahead-of-monsoon-haryana-pushes-zero-flood-plan/)); 155 points under 24-hour watch with a named officer for each ([Tribune, 31 Jul 2026](https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/)) | All 155–159 hotspots on the map with exact pins and zones. MCG grade A/1/High raises Likely to Red. A deeper drainage network gives a real "critical points" ranking | 21 hotspots from news, pins from OpenStreetMap (unverified), zones for 10 |
| **D2** | **Post-storm records**: for each storm, every watched point: waterlogged yes/no, depth, duration (the field reports with geotagged photos) | 154 locations reported waterlogged after one storm ([Tribune, 26 May 2025](https://www.tribuneindia.com/news/haryana/rain-unmasks-civic-lapses-gurugram-reports-waterlogging-at-154-locations)); 155 points after ~225 mm ([NewKerala, 9 Aug 2026](https://www.newkerala.com/news/a/gurugram-identifies-155-waterlogging-prone-points-municipal-corporation-gurugram-984.htm)); field staff file geotagged reports to the control room ([Tribune, 31 Jul 2026](https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/)) | **Labels with both floods and dry cases**, which news can't give. Thresholds recalibrated on real outcomes; the machine-learning model (Tier B) trains; the scorecard counts hits, misses and false alarms | Rules use starting thresholds. 48 news candidates (floods only) wait for review. Tier B stays "Not trained" |
| **D3** | **Rain gauge readings**: station, time, mm (hourly if kept, else daily), live and back to 2018 | The district administration publishes station totals after storms (e.g. Wazirabad 85 mm, Kadipur 80 mm, Harsaru 80 mm on 1 Sep 2025, [Republic](https://www.republicworld.com/amp/india/gurugram-rain-video-shows-submerged-roads-of-patel-nagar)); IMD runs automatic weather stations | **The biggest accuracy gain.** On 39 reported floods, the rules flagged 12; every miss was a day when model rain was far below gauge rain (e.g. 9 Jul 2023: model 12–21 mm, reported 150 mm). Gauge rain for past days fixes training and replays; live gauges allow a bias correction and short-range nowcast | Model rain (ECMWF), judged against its own record. Short cloudbursts are under-read; documented in MODEL.md |
| **D4** | **Drain network and condition**: storm and master drain alignments, capacity, desilting dates | Master drains at Narsinghpur, Khandsa Chowk (Hero Honda Chowk to Sector-10 depot), Sector 38, Sectors 17/18; 544 km desilted (Centre in the Lok Sabha, [Tribune, 8 Aug 2025](https://www.tribuneindia.com/news/haryana/natural-gradient-between-aravallis-najafgarh-drain-behind-ggram-flooding-centre-in-ls)) | Real drains carved into the terrain (same method as the OSM drains); `drain_silt_status` becomes a model input ("drain desilted 3 days ago") | OpenStreetMap drains (incomplete, mostly unnamed); `drain_silt_status` empty |
| **D5** | **Pump and equipment register**: id, type, capacity, base, status | 141 heavy-duty pumps and 77 suction tankers (Lok Sabha reply, as above); pumps, super-suckers and tankers on standby ([Tribune, 31 Jul 2026](https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/)) | Orders name a specific pump ("send pump P-07 from Sector 10 depot") and flag shortfalls when Red spots outnumber free pumps | Orders say "move a pump here"; the officer chooses which |
| **D6** | **Zones and duty roster**: 8 zone boundaries; officer per hotspot (EE → AE → JE → sanitation staff) | 8 zones in 2 clusters ([Tribune, 16 Jun 2026](https://www.tribuneindia.com/news/delhi/mcg-expands-cluster-zone-system-to-boost-civic-services-in-gurugram/)); a named chain of responsibility for each point ([Tribune, 31 Jul 2026](https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/)) | Orders grouped per zone and sent to the responsible JE (milestone 7, sandbox only) | Orders per zone where the zone is known, "Zone not set" otherwise; officers copy and send |
| **D7** | **Citizen complaints**: time, location, category (waterlogging) | Staff told to respond to citizen complaints through the control room (same article) | Near-real-time confirmation that a forecast came true; extra labels with exact times | None; officers use the "Report" form |

**Privacy:** D6 contact details stay on the server and are never published;
Agrim's API never returns phone numbers. D7 needs only time, place and
category, not the complainant's identity.

---

## 3. Proposed: doesn't exist yet (optional)

| # | Proposal | Why | Agrim without it |
|---|---|---|---|
| P1 | Drain water-level sensors (e.g. ultrasonic, 5-minute readings) at the 4 "extremely critical" hotspots | Live proof that water is rising; the field `drain_level_m` is already in every forecast | Works fully; the field stays empty |

---

## 4. Assumptions

| # | Assumption | Basis | If it's wrong |
|---|---|---|---|
| A1 | Model rain (ECMWF) shows *when* and roughly *where* it rains, but under-reads short cloudbursts | 12 of 39 reported floods flagged; misses were low model-rain days | Already the case: hence rarity scoring and D3 |
| A2 | The 21 seed hotspots are representative of MCG's list | They match the localities MCG's own watch-list coverage names (Tribune, 31 Jul 2026) | D1 replaces them |
| A3 | OpenStreetMap pins are within ~150 m of the real hotspot | Geocoder matches, checked by name | Team checks pins (`?pin=1`) or D1 supplies them |
| A4 | A 30 m surface DEM + OSM drains captures the main flow direction, not local drain capacity | Matches the Centre's Lok Sabha statement on the gradient | D4 improves local detail |
| A5 | Rule thresholds are starting values | No labelled outcomes yet | Recalibrate on D2 (and reviewed candidates) |
| A6 | SOP timings: T-24 orders, T-12 gullies and pumps, T-3 pump test, T+24 report | Project brief | Edit `model/orders.py` |
| A7 | MCG has pumps and crews to act on Red/Amber orders | 141 pumps, 77 tankers (Lok Sabha reply) | D5 makes shortfalls visible |
| A8 | Officers report what happened after storms | The desk's Report form; MCG already files field reports | Fewer dry labels; Tier B waits longer |
| A9 | Simulated storms are illustrative, not observations | Labelled EXERCISE, `is_synthetic: true` | n/a |
| A10 | Zones follow MCG's 8-zone structure (2026) | Tribune, 16 Jun and 31 Jul 2026 | D6 supplies boundaries |

---

## 5. What improves as data arrives

1. **Today (public only):** Red/Amber/Green forecast, simulator and replays,
   drainage network, MCG desk with orders, checklist, overrides and reports.
2. **+ D1, D6:** all hotspots, exact pins and zones; orders to the right zone
   and officer; a meaningful critical-points ranking.
3. **+ D2:** recalibrated thresholds; the scorecard; Tier B trains once there
   are 30 labels (8 floods, 8 dry).
4. **+ D3:** rain bias corrected; far fewer missed cloudburst days.
5. **+ D4, D5:** drain condition in the score; pump-specific orders.
6. **+ P1 (optional):** live confirmation from sensors.

---

## 6. Draft data request to MCG

> **To:** Commissioner, Municipal Corporation of Gurugram (copy: CEO, GMDA)
> **Subject:** Request for monsoon waterlogging data for a flood early-warning prototype (SustainX 2026)
>
> We are building Agrim, an open early-warning tool that ranks Gurugram's
> waterlogging hotspots 24–48 hours before rain and turns the ranking into
> SOP orders for zone teams. It runs today on public data. To make its
> warnings accurate and checkable, we request, in any convenient format
> (spreadsheet or GIS file):
>
> 1. The current list of waterlogging hotspots with zone, severity grade and location.
> 2. Post-storm waterlogging records for 2018–2026: date, location, depth and
>    duration, including watched points that stayed clear.
> 3. Rain gauge readings for Gurugram stations, 2018–2026 (hourly if available).
> 4. Storm-drain alignments and desilting dates.
> 5. The pump and equipment register.
> 6. Zone boundaries.
>
> We will use the data only for this project, credit MCG/GMDA as the source,
> keep personal details (officer phone numbers, complainants) off any public
> page, and share the results and code with MCG.
>
> — Varun Tuteja, Team Agrim
