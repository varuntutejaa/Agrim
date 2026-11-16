// "Sensors & infrastructure": the proposed minimum sensor network (brief item 4).
// The full version is docs/SENSORS.md; keep the two in step. Counts come from
// data/synthetic/proposed_sensors.geojson (tests/test_consistency.py checks them).
// Costs are deliberately TODO until each one is sourced (GeM, a government
// tender or an Indian vendor quote); never fill in an estimate here.

const DEVICES: [string, string, string][] = [
  ["Rain gauge station", "25", "Actual rain over each hotspot's catchment, every few minutes: the cloudburst the weather models miss"],
  ["Drain water-level station", "43", "Water rising in the drain at outfalls, between hotspots, and below the last hotspot"],
  ["Underpass monitor", "8", "Water depth at the lowest point of the mapped underpasses nearest the hotspots"],
  ["Underpass camera (optional)", "To decide (0 to 8)", "A picture to confirm the depth reading before an underpass is closed"],
];

const SPECS: { title: string; points: string[] }[] = [
  { title: "Rain gauge station", points: [
    "Tipping-bucket gauge; resolution and accuracy to IMD's specification for its automatic rain gauges (to attach).",
    "Open ground clear of buildings and trees, following WMO-No. 8 exposure guidance. Prefer walled public compounds: MCG offices, fire and police stations, schools, parks.",
    "Readings every 5 minutes, kept on the device and re-sent after a network outage.",
    "Cellular link (any operator, chosen per site by signal) in an open format (JSON or CSV over HTTPS): no lock-in to a vendor's cloud.",
    "Solar panel and battery sized for a cloudy monsoon week (days of autonomy to set from site solar data).",
  ] },
  { title: "Drain water-level station", points: [
    "Non-contact sensor above the water, looking down. Radar preferred: unlike ultrasonic, it doesn't drift with air temperature.",
    "Range from drain bed to above the drain top, measured per site.",
    "On a bracket under a bridge, culvert headwall or pole, above head height.",
    "Reports every 5 minutes, sooner when the level rises (thresholds set per site with the zone engineer).",
  ] },
  { title: "Underpass monitor", points: [
    "Water depth at the lowest point: radar on the wall or ceiling above it, or a pressure sensor in the sump.",
    "Alerts the MCG control room when the depth passes the level MCG sets for closing the underpass.",
    "Optional camera (day and night) sends a still picture every few minutes, not live video. First check whether city or traffic police cameras already cover the underpass.",
  ] },
];

const PLACEMENT: [string, string][] = [
  ["Rain gauges (25)", "Clustered over the hotspots and the land that drains into them, so every hotspot's catchment has a gauge nearby."],
  ["Drain sensors (43)", "At each hotspot's outfall (19), midway along each flow path between hotspots (8), then on the onward flow below the last hotspots: about 2 to 4.5 km downstream on each of the 11 paths (11), and 6 to 9 km downstream on five of them (5)."],
  ["Underpass monitors (8)", "At the mapped underpasses (OpenStreetMap) nearest the hotspots, at least 500 m apart."],
];

const HARDENING: [string, string][] = [
  ["Monsoon rain and dust", "Logger and battery boxes rated IP66 or better (IEC 60529: dust-tight, protected against powerful water jets)"],
  ["Submersion in a flood", "Sensor heads and cable joints that can go under water rated IP68 (IEC 60529: continuous immersion)"],
  ["Knocks and vandalism", "Street-level enclosures rated IK10 (IEC 62262, the highest impact class)"],
  ["Summer heat", "Sun shield and ventilation; electronics rated for Gurugram's summer peak (range to confirm from IMD normals)"],
  ["Lightning", "Surge protection and earthing on every mast"],
  ["Theft and tampering", "Mounted above reach, anti-tamper fasteners, cables in steel conduit, solar panel high, walled compounds where possible"],
  ["Silent failure", "Door switch, tilt sensor and GPS check raise a tamper alert; battery and signal in every message; a station that stops reporting raises a \"no data\" alert"],
  ["Bad readings", "Readings stuck at one value, out of range, or far from neighbouring gauges are flagged and left out of the forecast until checked"],
];

const UPKEEP: [string, string][] = [
  ["Before the monsoon (May to June)", "Full service: clean gauge funnels, check calibration with a known volume of water, clear debris under drain sensors, test batteries, solar and telemetry"],
  ["During the monsoon (July to September)", "A monthly visit, and a check after every heavy storm"],
  ["After the monsoon (October)", "Inspect, repair, replace damaged parts"],
  ["Rest of the year", "Weekly remote health check; one visit per quarter"],
];

const COSTS: [string, string][] = [
  ["Rain gauge station (gauge, logger, telemetry, solar and battery, mast)", "25"],
  ["Drain water-level station (radar sensor, logger, telemetry, solar and battery, bracket)", "43"],
  ["Underpass monitor (level sensor, logger, telemetry, power, alert link)", "8"],
  ["Underpass camera (optional)", "To decide"],
  ["Installation and civil works, per site", "76"],
  ["SIM and data plan, per station per year", "76"],
  ["Comprehensive maintenance contract, per year", "1"],
  ["Calibration, cleaning and spares, per year", "1"],
  ["Hosting and software upkeep, per year", "1"],
];

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="m-0 mt-4 border-t border-rule">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-x-6 gap-y-1 border-b border-rule py-3 text-[14px] leading-relaxed md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <dt className="font-semibold text-ink">{k}</dt>
          <dd className="m-0 text-ink-2">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function SensorsPage() {
  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-10 md:px-10 md:pt-14">
      <h1 className="h-page">A minimum sensor network, so MCG sees the rain and the rising water directly.</h1>
      <p className="mt-5 max-w-[68ch] text-[16px] leading-[1.7] text-ink-2">
        This is a proposal: no sensor is installed, and Agrim works without them. The counts are the team's proposal; the
        sites on the Drainage map are computed from the drainage network and labelled illustrative. Specifications are
        requirements, not products, so any supplier who meets them can bid. Costs stay blank until each is sourced.
      </p>

      <section className="mt-14">
        <h2 className="h-sub">What we propose</h2>
        <ul className="m-0 mt-4 list-none border-t border-rule p-0">
          {DEVICES.map(([name, n, why]) => (
            <li key={name} className="grid gap-x-6 gap-y-1 border-b border-rule py-3 text-[14px] leading-relaxed md:grid-cols-[minmax(0,1fr)_140px_minmax(0,2fr)]">
              <span className="font-semibold text-ink">{name}</span>
              <span className="figure text-ink">{n}</span>
              <span className="text-ink-2">{why}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="h-sub">Specification, vendor-neutral</h2>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-3">
          {SPECS.map((d) => (
            <div key={d.title}>
              <h3 className="text-[16px] font-semibold text-ink">{d.title}</h3>
              <ul className="m-0 mt-2 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-ink-2">
                {d.points.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="h-sub">Where they go</h2>
        <p className="mt-2 max-w-[68ch] text-[14px] text-muted">
          The same sites as Drainage, Show proposed sensors. Each still needs a field visit: who owns the spot, mobile
          signal, safe access, and open sky for gauges.
        </p>
        <Rows rows={PLACEMENT} />
      </section>

      <section className="mt-14">
        <h2 className="h-sub">Weatherproofing and vandal resistance</h2>
        <Rows rows={HARDENING} />
      </section>

      <section className="mt-14">
        <h2 className="h-sub">Who keeps them working</h2>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">
          MCG owns the stations. The supplier maintains them under a comprehensive maintenance contract bought in the same
          tender as the equipment, for several years, so year 2 doesn't need a new budget approval. The control room watches
          station health on the Agrim desk; zone engineers look at stations on their rounds. The contract sets an uptime
          target, repair times in the monsoon, penalties, spares and battery replacement, and hands over all data in an open
          format. If a station fails, the forecast keeps running without it.
        </p>
        <Rows rows={UPKEEP} />
      </section>

      <section className="mt-14">
        <h2 className="h-sub">Cost</h2>
        <p className="mt-2 max-w-[68ch] text-[14px] text-muted">
          To be sourced from GeM, a government tender or an Indian vendor quote. No figure here is an estimate.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-rule">
                <th scope="col" className="label pb-2 pr-4">Item</th>
                <th scope="col" className="label pb-2 pr-4 text-right">Unit cost (₹)</th>
                <th scope="col" className="label pb-2 pr-4 text-right">Quantity</th>
                <th scope="col" className="label pb-2 pr-4 text-right">Total (₹)</th>
                <th scope="col" className="label pb-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {COSTS.map(([item, qty]) => (
                <tr key={item} className="border-b border-rule align-top">
                  <td className="py-2.5 pr-4 text-ink">{item}</td>
                  <td className="py-2.5 pr-4 text-right text-muted">To source</td>
                  <td className="figure py-2.5 pr-4 text-right">{qty}</td>
                  <td className="py-2.5 pr-4 text-right text-muted">To source</td>
                  <td className="py-2.5 text-muted">GeM, tender or vendor quote</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-muted">76 stations = 25 gauges + 43 drain sensors + 8 underpass monitors. Full version: docs/SENSORS.md.</p>
      </section>
    </div>
  );
}
