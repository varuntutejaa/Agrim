# Sensors and data infrastructure (proposal)

Agrim runs today without any sensors. This is the minimum network we propose
so that MCG can see rain and rising water directly, instead of relying only
on global weather models that under-read Gurugram's short cloudbursts (see
docs/MODEL.md, backtest).

Everything here is a **proposal**. No sensor is installed. The sites on the
Drainage map are illustrative and labelled "Proposed, illustrative".

**Status of the numbers.** The counts (25 / 43 / 8) are the team's proposal.
The sites are computed from the drainage network by
`pipeline/propose_sensors.py`. The spec values below are *requirements we
propose*, to be confirmed with MCG and IMD. **No cost is filled in yet:**
every cost is marked TODO until it can be sourced from GeM, a government
tender or an Indian vendor quote.

## 1. What we propose

| Device | Count | What it tells MCG |
|---|---|---|
| Rain gauge station | 25 | Actual rain over each hotspot's catchment, every few minutes: the cloudburst the models miss |
| Drain water-level station | 43 | Water rising in the drain at outfalls, between hotspots, and below the last hotspot |
| Underpass monitor | 8 | Water depth at the lowest point of the mapped underpasses nearest the hotspots |
| Underpass camera (optional) | TODO (0 to 8) | A picture to confirm the depth reading before closing an underpass |

## 2. Specification (vendor-neutral)

Written as requirements, not products, so any supplier who meets them can bid.

### Rain gauge station
- **Sensor:** tipping-bucket rain gauge. Resolution and accuracy to IMD's
  specification for its automatic rain gauges (TODO: attach the IMD spec).
- **Siting:** open ground, clear of buildings and trees, following the
  exposure guidance in WMO-No. 8 (*Guide to Instruments and Methods of
  Observation*, precipitation chapter). Prefer secure public compounds:
  MCG offices, fire stations, police stations, schools, walled parks.
- **Logger:** time-stamped readings every 5 minutes, kept on the device and
  re-sent after a network outage, so no rain is lost.
- **Telemetry:** cellular (any Indian operator, chosen per site by signal),
  with an open data format (JSON or CSV over HTTPS) so Agrim or any other
  system can read it. No lock-in to a vendor's cloud.
- **Power:** solar panel and battery sized to run through a cloudy monsoon
  week (TODO: days of autonomy, from site solar data).

### Drain water-level station
- **Sensor:** non-contact level sensor mounted above the water, looking
  down. Radar is preferred, because unlike ultrasonic its reading doesn't
  drift with air temperature.
- **Range:** from the drain bed to above the top of the drain, measured per
  site (TODO: survey each drain's depth).
- **Mounting:** on a bracket under a bridge, culvert headwall or pole, above
  head height and out of reach.
- **Reporting:** every 5 minutes, sooner when the level is rising (TODO:
  thresholds per site, set with the zone engineer).
- **Logger, telemetry, power:** as for the rain gauge.

### Underpass monitor
- **Sensor:** water depth at the lowest point of the carriageway: a radar
  sensor on the wall or ceiling above it, or a pressure sensor in the sump.
- **Alert:** to the MCG control room when the depth passes the level MCG
  sets for closing the underpass (TODO: the closing depth, from MCG/traffic
  police practice).
- **Optional camera:** day and night (infrared), sending a still picture
  every few minutes rather than live video, to keep data costs low. First
  check whether existing city or traffic police cameras already cover the
  underpass (TODO: ask MCG, GMDA and Gurugram Traffic Police).
- **Privacy (camera):** pointed at the road surface at the low point;
  retention as per MCG's CCTV policy (TODO).

## 3. Where they go (matches the Drainage map)

Computed by `pipeline/propose_sensors.py` from the drainage network:

- **Rain gauges (25):** clustered over the hotspots and the land that drains
  into them (hotspots weighted three times), so every hotspot's catchment has
  a gauge nearby.
- **Drain sensors (43):** first at each hotspot's outfall (19), then midway
  along each flow path between two hotspots (8), then on the onward flow
  below the last hotspots: one on each of the 11 onward paths, about 2 to
  4.5 km downstream (11), and five more about 6 to 9 km downstream (5).
- **Underpass monitors (8):** at the mapped underpasses (OpenStreetMap:
  `tunnel=yes`, or "underpass" in the name) nearest the hotspots, at least
  500 m apart.

Each site still needs a field visit before purchase: ownership of the spot,
mobile signal, safe access for maintenance, and (for gauges) open sky.

## 4. Weatherproofing and vandal resistance

| Risk | Requirement |
|---|---|
| Monsoon rain and dust | Logger and battery boxes rated **IP66** or better (IEC 60529: dust-tight, protected against powerful water jets) |
| Submersion in a flood | Anything that can go under water (drain and underpass sensor heads, cable joints) rated **IP68** (IEC 60529: continuous immersion, depth as stated by the maker) |
| Knocks and vandalism | Street-level enclosures rated **IK10** (IEC 62262, the highest impact class) |
| Summer heat | Sun shield and ventilation; electronics rated for Gurugram's summer peak (TODO: confirm the range from IMD normals) |
| Lightning | Surge protection and earthing on every mast |
| Theft and tampering | Mount on poles or brackets above reach; security (anti-tamper) fasteners; cables in steel conduit; solar panel mounted high; prefer walled public compounds |
| Silent failure | **Tamper alerts:** door switch on the enclosure, tilt sensor, GPS position check. **Health alerts:** battery voltage and signal in every message, and a "no data" alert to the control room if a station misses its reports (TODO: how many missed reports trigger it) |
| Bad readings | Automatic checks: a reading stuck at one value, outside the possible range, or far from neighbouring gauges is flagged and left out of the forecast until checked |

## 5. Operations and maintenance

**Who.** MCG owns the stations. The supplier maintains them under a
comprehensive maintenance contract (CMC) bought in the **same tender** as the
equipment, for several years (TODO: term, e.g. 5 years), so year 2 doesn't
depend on a new budget approval. MCG's control room watches station health
on the Agrim desk; zone JEs look at the stations on their routine rounds.

**When.**

| When | What |
|---|---|
| Before the monsoon (May to June) | Full service: clean gauge funnels and buckets, check calibration with a known volume of water, clear debris under drain sensors, test batteries, solar panels and telemetry |
| During the monsoon (July to September) | A monthly visit, and a check after every heavy storm |
| After the monsoon (October) | Inspect, repair, replace damaged parts |
| Rest of the year | Remote health check every week; one visit per quarter |

**In the contract.** Uptime target and repair time (TODO: e.g. a station
back within a set number of hours in the monsoon), penalties for missing
them, a stock of spares (TODO), battery replacement at the maker's stated
life (TODO), and handover of all data in an open format.

**Year 2 and after.** The CMC continues; SIM data plans and hosting renew
yearly (in the cost table below). If a station fails, Agrim keeps working:
the forecast already runs without sensor data, so a dead sensor only drops
out of the score and never blanks the forecast.

## 6. Cost (TODO: to be sourced)

Quantities come from the proposed network. **Unit costs are deliberately
blank** until each one is sourced from GeM, a government tender or an Indian
vendor quote; no figure here is an estimate.

| Item | Unit cost (₹) | Quantity | Total (₹) | Source (GeM / tender / Indian vendor) |
|---|---|---|---|---|
| Rain gauge station (gauge, logger, telemetry, solar and battery, mast) | TODO | 25 | TODO | TODO |
| Drain water-level station (radar sensor, logger, telemetry, solar and battery, bracket) | TODO | 43 | TODO | TODO |
| Underpass monitor (level sensor, logger, telemetry, power, alert link) | TODO | 8 | TODO | TODO |
| Underpass camera (optional) | TODO | TODO (0 to 8) | TODO | TODO |
| Installation and civil works, per site | TODO | 76 | TODO | TODO |
| **Capital total** | | | **TODO** | |
| SIM and data plan, per station per year | TODO | 76 | TODO | TODO |
| Comprehensive maintenance contract, per year | TODO | 1 | TODO | TODO |
| Calibration, cleaning and spares, per year | TODO | 1 | TODO | TODO |
| Hosting and software upkeep, per year | TODO | 1 | TODO | TODO |
| **Yearly running total** | | | **TODO** | |

76 = 25 + 43 + 8 stations (cameras, if any, add their own data plans).
