// "Data & assumptions": what Agrim runs on today, what it assumes, and what
// MCG data would add, with evidence that each item exists. The full version
// is docs/DATA_REQUIREMENTS.md; keep the two in step.
import type { ReactNode } from "react";

const TRIB_WATCH = "https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/";
const TRIB_159 = "https://www.tribuneindia.com/news/gurugram/gurugram-flags-159-waterlogging-hotspots-ahead-of-monsoon-haryana-pushes-zero-flood-plan/";
const TRIB_154 = "https://www.tribuneindia.com/news/haryana/rain-unmasks-civic-lapses-gurugram-reports-waterlogging-at-154-locations";
const LOK_SABHA = "https://www.tribuneindia.com/news/haryana/natural-gradient-between-aravallis-najafgarh-drain-behind-ggram-flooding-centre-in-ls";
const REPUBLIC = "https://www.republicworld.com/amp/india/gurugram-rain-video-shows-submerged-roads-of-patel-nagar";
const ZONES8 = "https://www.tribuneindia.com/news/delhi/mcg-expands-cluster-zone-system-to-boost-civic-services-in-gurugram/";

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="link">{children}</a>
);

const PUBLIC_NOW: [string, string][] = [
  ["Rain forecast, 3 models, next 72 h", "Open-Meteo (ECMWF, GFS, ICON)"],
  ["Each hotspot's rain record, 2018 to 2026", "Open-Meteo archive (ECMWF)"],
  ["Terrain and drainage network", "Copernicus DEM, OpenStreetMap, ESA WorldCover"],
  ["21 hotspots, zones for 10", "News coverage, OpenStreetMap, Tribune (31 Jul 2026)"],
  ["Flood event dates, district level", "India Flood Inventory (IIT Delhi), CC-BY-4.0"],
  ["48 candidate flood reports", "News articles, each linked, awaiting review"],
];

type Ask = { id: string; data: string; evidence: ReactNode; unlocks: string; without: string };
const ASKS: Ask[] = [
  { id: "D1", data: "Graded hotspot list: name, zone, grade, location",
    evidence: <>159 hotspots graded 4 / 39 / 56 / 60 (<A href={TRIB_159}>Tribune, Apr 2026</A>); 155 under 24-hour watch, an officer for each (<A href={TRIB_WATCH}>Tribune, Jul 2026</A>)</>,
    unlocks: "Every hotspot with an exact pin and zone; MCG grade feeds Red; a real critical-points ranking",
    without: "21 hotspots from news, pins from OpenStreetMap" },
  { id: "D2", data: "Post-storm records: each watched point, waterlogged or clear, depth, hours",
    evidence: <>154 locations listed after one storm (<A href={TRIB_154}>Tribune, May 2025</A>); geotagged field reports to the control room (<A href={TRIB_WATCH}>Tribune, Jul 2026</A>)</>,
    unlocks: "Flood and dry labels: recalibrated thresholds, the scorecard, and the machine-learning model",
    without: "Starting thresholds; ML waits for labels" },
  { id: "D3", data: "Rain gauge readings, live and since 2018",
    evidence: <>District station totals published after storms, e.g. Wazirabad 85 mm (<A href={REPUBLIC}>Republic, Sep 2025</A>); IMD weather stations</>,
    unlocks: "The biggest gain: fixes the cloudburst days the forecast model under-reads",
    without: "Model rain, judged against its own record" },
  { id: "D4", data: "Storm-drain alignments, capacity, desilting dates",
    evidence: <>Master drains at Narsinghpur, Khandsa Chowk and others; 544 km desilted (<A href={LOK_SABHA}>Lok Sabha reply, Aug 2025</A>)</>,
    unlocks: "Real drains in the terrain model; drain condition as a risk input",
    without: "OpenStreetMap drains (incomplete)" },
  { id: "D5", data: "Pump and equipment register",
    evidence: <>141 heavy-duty pumps, 77 suction tankers (<A href={LOK_SABHA}>Lok Sabha reply</A>)</>,
    unlocks: "Orders name the exact pump; shortfalls flagged",
    without: "Orders say \"move a pump here\"" },
  { id: "D6", data: "Zone boundaries and duty roster",
    evidence: <>8 zones in 2 clusters (<A href={ZONES8}>Tribune, Jun 2026</A>); named chain of officers per point (<A href={TRIB_WATCH}>Jul 2026</A>)</>,
    unlocks: "Orders per zone, sent to the responsible engineer",
    without: "Zone shown where known; officers copy orders" },
  { id: "D7", data: "Citizen waterlogging complaints (time, place, no names)",
    evidence: <>Staff told to respond to complaints via the control room (<A href={TRIB_WATCH}>Tribune, Jul 2026</A>)</>,
    unlocks: "Live confirmation; extra labels with exact times",
    without: "Officers use the Report form" },
];

const ASSUMPTIONS: string[] = [
  "Forecast-model rain shows when and roughly where it rains, but under-reads short cloudbursts.",
  "The 21 seed hotspots are representative of MCG's list (they match the localities MCG's watch-list coverage names).",
  "OpenStreetMap pins are within about 150 m of each hotspot until the team or MCG confirms them.",
  "A 30 m terrain model plus mapped drains captures the main flow direction, not local drain capacity.",
  "Rule thresholds are starting values, to be recalibrated on real outcomes.",
  "SOP timings: orders at T-24 h, gullies and pumps by T-12 h, pump test at T-3 h, report at T+24 h.",
  "MCG has pumps and crews to act on Red and Amber orders.",
  "Officers report what happened after storms; that's where dry-case labels come from.",
  "Simulated storms are illustrative and always labelled as an exercise.",
  "Zones follow MCG's 8-zone structure (2026).",
];

const MISSED: [string, string, string, string][] = [
  ["9 Jul 2023", "12 to 21 mm", "150 mm reported", "0 of 4"],
  ["11 Aug 2024", "11 to 16 mm", "53 mm by 8:30 am", "0 of 5"],
  ["9 Jul 2025", "7 to 11 mm", "2.5 ft water at Subhash Chowk", "0 of 5"],
  ["31 Jul 2024", "59 to 67 mm", "widespread waterlogging", "6 of 6"],
];

export default function DataPage() {
  const COLS = "md:grid-cols-[48px_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.1fr)]";
  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-10 md:px-10 md:pt-14">
      <h1 className="h-page">
        Agrim runs on public data today. Here is what MCG's own data would add, and evidence that it exists.
      </h1>
      <p className="mt-5 max-w-[65ch] text-[16px] leading-[1.7] text-ink-2">
        Nothing here depends on data that doesn't exist. MCG already collects everything we ask for below; it just isn't
        published. The one item that doesn't exist yet, drain water-level sensors, is an optional proposal, and Agrim works
        without it.
      </p>

      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <h2 className="h-sub">Data we'd ask MCG / GMDA for</h2>
          <div className={`mt-4 hidden border-b-2 border-ink pb-2 md:grid md:gap-x-4 ${COLS}`} role="presentation">
            <span className="label">#</span><span className="label">Data</span><span className="label">Evidence it exists</span>
            <span className="label">What it adds</span>
          </div>
          <ol className="m-0 mt-4 list-none border-t-2 border-ink p-0 md:mt-0 md:border-t-0">
            {ASKS.map((a) => (
              <li key={a.id} className={`grid gap-y-1.5 border-b border-rule py-4 text-[14px] leading-relaxed md:gap-x-4 ${COLS}`}>
                <span className="text-[15px] font-extrabold">{a.id}</span>
                <span className="font-extrabold text-ink">{a.data}</span>
                <span className="text-ink-2">{a.evidence}</span>
                <span className="text-ink-2">
                  {a.unlocks}
                  <span className="mt-1 block text-[13px] text-muted">Today: {a.without}</span>
                </span>
              </li>
            ))}
            <li className={`grid gap-y-1.5 border-b border-rule py-4 text-[14px] leading-relaxed md:gap-x-4 ${COLS}`}>
              <span className="text-[15px] font-extrabold">P1</span>
              <span className="font-extrabold text-ink">Drain water-level sensors at the 4 most critical points</span>
              <span className="text-muted">Doesn't exist yet: an optional proposal</span>
              <span className="text-ink-2">Live proof that water is rising<span className="mt-1 block text-[13px] text-muted">Today: the field stays empty; nothing depends on it</span></span>
            </li>
          </ol>
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            Import templates for each item are in data/templates; hotspot lists and post-storm records can be imported today
            with pipeline/import_mcg.py.
          </p>
        </section>

        <aside className="space-y-12">
          <section>
            <h2 className="h-sub">Runs today on public data</h2>
            <ul className="m-0 mt-4 list-none border-y-2 border-ink p-0">
              {PUBLIC_NOW.map(([what, src]) => (
                <li key={what} className="border-b border-rule py-3 text-[14px] last:border-b-0">
                  <div className="font-medium text-ink">{what}</div>
                  <div className="mt-0.5 text-[13px] text-muted">{src}</div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="h-sub">Why rain gauges (D3) matter most</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
              On 39 reported floods, the rules flagged 12. Every miss was a day the forecast model under-read the rain.
            </p>
            <table className="mt-4 w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th scope="col" className="label pb-2">Day</th><th scope="col" className="label pb-2">Model</th>
                  <th scope="col" className="label pb-2">Reported</th><th scope="col" className="label pb-2 text-right">Flagged</th>
                </tr>
              </thead>
              <tbody>
                {MISSED.map(([d, m, r, f]) => (
                  <tr key={d} className="border-b border-rule align-top">
                    <td className="whitespace-nowrap py-2 pr-2 font-medium">{d}</td><td className="whitespace-nowrap pr-2">{m}</td>
                    <td className="pr-2 text-ink-2">{r}</td><td className="text-right font-extrabold">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[13px] text-muted">From unreviewed news candidates; details in docs/MODEL.md.</p>
          </section>
        </aside>
      </div>

      <section className="mt-16">
        <h2 className="h-sub">Assumptions</h2>
        <ol className="m-0 mt-4 grid list-none gap-x-12 gap-y-3 border-t-2 border-ink p-0 pt-4 md:grid-cols-2">
          {ASSUMPTIONS.map((a, i) => (
            <li key={a} className="flex gap-4 text-[14px] leading-relaxed text-ink-2">
              <span className="w-8 shrink-0 font-extrabold text-ink">A{i + 1}</span>
              {a}
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-[72ch] text-[13px] leading-relaxed text-muted">
          Full version, including the draft data request to MCG: docs/DATA_REQUIREMENTS.md. Drainage direction matches the
          Centre's Lok Sabha statement (Aravallis east, Najafgarh drain north-west, about 78 m drop).
        </p>
      </section>
    </div>
  );
}
