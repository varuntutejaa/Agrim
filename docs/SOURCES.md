# Data sources

Every number Agrim shows must trace back to a row in this file, or be
labelled **Illustrative data** (and stored under `data/synthetic/` with
`is_synthetic = true`). Only free or public sources are used.

Status: **in use** = fetched by code today; **planned** = milestone noted.

## In use (milestone 1)

| # | Data | Source | Licence / terms | Fetched by | Notes |
|---|------|--------|-----------------|-----------|-------|
| 1 | Hourly rainfall forecast, ~2 km grid over Gurugram, past 3 + next 3 days | [Open-Meteo Forecast API](https://open-meteo.com/en/docs): models `ecmwf_ifs` (ECMWF IFS), `gfs_seamless` (NOAA GFS), `icon_seamless` (DWD ICON) | CC BY 4.0, free for non-commercial use ([terms](https://open-meteo.com/en/terms)) | `pipeline/fetch_rain_forecast.py` | See "Resolution caveat" below |
| 2 | Hourly historical rainfall, Jun–Sep 2018 onward, at each hotspot | [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api): `ecmwf_ifs` (IFS analysis, ~9 km, from 2017) and `era5` (ECMWF ERA5 reanalysis, ~25 km) | CC BY 4.0; ERA5 © Copernicus Climate Change Service | `pipeline/fetch_rain_history.py` | ERA5-Land returns no precipitation for Gurugram on Open-Meteo (checked 8 Nov 2026), so it is not used |
| 3 | Hotspot coordinates (geocoded) | [OSM Nominatim](https://nominatim.org/) search, then [Overpass API](https://overpass-api.de/) name search | © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright); [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) (max 1 request/s, cached) | `pipeline/geocode_hotspots.py` | Every pin is unverified until a team member checks it (`verified = yes`). The geocoder's match is stored in `geocode_label` |
| 4 | Basemap | [OpenFreeMap](https://openfreemap.org/) "positron" style, built on [OpenMapTiles](https://openmaptiles.org/) | Free, no key; attribution © OpenMapTiles © OpenStreetMap contributors | `web/src/components/HotspotMap.tsx` | |

## Compiled by the team

| Data | File | Source of each row |
|------|------|--------------------|
| Hotspot names (seed list of 21) | `data/hotspots_seed.csv` | Seed list in the project brief. **TODO:** add the news article or MCG notice that names each hotspot, in the `notes` column. |
| MCG's full list of 159 hotspots | `data/hotspots.csv` (later) | **TODO:** MCG document / RTI reply, with link and date |
| MCG zones for 10 hotspots | `data/hotspots.csv` (`zone`) | [The Tribune, 31 Jul 2026](https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/): localities on MCG's 155-point watch list named by zone (VI, III, VII) |
| MCG data not yet released | `docs/DATA_REQUIREMENTS.md` | What we'd request, with evidence each item exists (Tribune 2025–2026, Lok Sabha reply via Tribune, Republic World) |
| Gurugram flood event dates (district level) | `data/external/ifi_gurugram_events.csv` | India Flood Inventory-Impacts v3, Saharia et al., IIT Delhi, [Zenodo 11275211](https://zenodo.org/records/11275211), CC-BY-4.0. Subset for Gurugram via `python -m pipeline.fetch_ifi`. Used only to find dates for hotspot-level news searches |
| Candidate flood reports (not yet labels) | `data/incidents_candidates.csv` | Found in news coverage (The Tribune, ThePrint/PTI, The Week/PTI, Careers360/PTI, Republic World), each row with its URL and what the article says. Become labels only after a team member reviews them (`python -m pipeline.review_candidates`) |
| Flood incidents (training labels) | `data/incidents.csv` | Each row carries its own `source_url` (news report etc.). Never invented. Add rows with `python -m pipeline.add_incident` |

## In use (milestone 2)

| # | Data | Source | Licence / terms | Fetched by | Notes |
|---|------|--------|-----------------|-----------|-------|
| 5 | Ground height, 30 m | [Copernicus DEM GLO-30](https://registry.opendata.aws/copernicus-dem/), read from the public AWS bucket `copernicus-dem-30m` (tiles N28 E076, N28 E077) | © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the EU and ESA; free licence | `pipeline/fetch_dem.py` | Surface model (includes roofs/trees); see docs/NETWORK.md |
| 6 | Drains, streams, canals | OpenStreetMap via [Overpass API](https://overpass-api.de/) (`waterway=drain/canal/river/stream/ditch`) | © OpenStreetMap contributors, ODbL | `pipeline/fetch_osm.py` | Incomplete and mostly unnamed in Gurugram |
| 7 | Built-up share | [ESA WorldCover](https://esa-worldcover.org/) 10 m v200 (2021), read from ESA's public AWS bucket (tile N27E075) | © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021), CC BY 4.0 | `pipeline/fetch_landcover.py` | Class 50 = built-up |

Derived from source 2 by `model/climatology.py`: each hotspot's ECMWF
monsoon rain record 2018–2026 as percentiles (`data/model/rain_climatology.csv`),
used to judge how unusual a forecast is. See [MODEL.md](MODEL.md).
Also derived from source 2 by `model/replay.py`: per-day rain at each hotspot
for the simulator's replays (`data/model/replay_days.csv`). This is model rain,
labelled as such in the UI, not rain-gauge readings.

Fonts (self-hosted via npm @fontsource): Newsreader and IBM Plex Sans/Mono,
both under the SIL Open Font License.

Derived from 5–7 by `pipeline/build_network.py`: flow directions, catchments,
hotspot links, critical-node ranking and terrain features (`data/network/`).
Method and limits: [NETWORK.md](NETWORK.md).

## Planned

| Milestone | Data | Source |
|-----------|------|--------|
| 3+ | Ground-truth rainfall (optional cross-check) | IMD gridded rainfall (0.25°, daily) from [IMD Pune](https://www.imdpune.gov.in/); IMD AWS station data if obtainable |
| any | MCG stormwater drain map | MCG (to request); would be burned into the DEM like the OSM drains |

## Resolution caveat (read before pitching "rain per hotspot")

The forecast grid points are ~2 km apart, but the models behind them are
coarser: ECMWF IFS ~9 km, DWD ICON global ~13 km, NOAA GFS ~25 km
(approximate; see each model's page on Open-Meteo). Neighbouring grid
points therefore often get identical numbers.

Measured on the 2025 monsoon history (19 located hotspots):
- ECMWF IFS gave **5 distinct rain series** across the 19 hotspots.
- ERA5 gave **1** (the same series for the whole city).
- For 31 Jul 2025 the IFS daily total ranged 25.2–29.5 mm across hotspots.

So "each hotspot uses rainfall for its own small area" means "for its model
grid cell, about 9 km across". Spatial detail *within* a cell comes from the
terrain/drainage network (milestone 2), not from the rainfall.
Model rainfall can also be well below what a rain gauge records in a short
convective burst; compare against IMD figures before quoting event totals.
