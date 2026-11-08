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
| Flood incidents (training labels) | `data/incidents.csv` | Each row carries its own `source_url` (news report etc.). Never invented. Add rows with `python -m pipeline.add_incident` |

## Planned

| Milestone | Data | Source |
|-----------|------|--------|
| 2 | Elevation, 30 m | NASA SRTM GL1 via [OpenTopography](https://opentopography.org/) (free API key) |
| 2 | Drains, canals, roads | OpenStreetMap via Overpass (`waterway=drain/canal`, `highway=*`) |
| 2/3 | Land cover, 10 m (built-up share) | [ESA WorldCover 2021](https://esa-worldcover.org/), CC BY 4.0 |
| 3+ | Ground-truth rainfall (optional cross-check) | IMD gridded rainfall (0.25°, daily) from [IMD Pune](https://www.imdpune.gov.in/); IMD AWS station data if obtainable |

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
