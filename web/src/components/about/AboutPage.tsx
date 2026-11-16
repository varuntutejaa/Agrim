// About: what Agrim is, how MCG works today versus with Agrim, and the team.
// The "today" column uses only the public reports cited on the Data page.
import type { ReactNode } from "react";

const TRIB_WATCH = "https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/";
const TRIB_159 = "https://www.tribuneindia.com/news/gurugram/gurugram-flags-159-waterlogging-hotspots-ahead-of-monsoon-haryana-pushes-zero-flood-plan/";
const TRIB_154 = "https://www.tribuneindia.com/news/haryana/rain-unmasks-civic-lapses-gurugram-reports-waterlogging-at-154-locations";
const LOK_SABHA = "https://www.tribuneindia.com/news/haryana/natural-gradient-between-aravallis-najafgarh-drain-behind-ggram-flooding-centre-in-ls";

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="link">{children}</a>
);

const TODAY_VS_AGRIM: { topic: string; today: ReactNode; agrim: string }[] = [
  { topic: "Where it floods",
    today: <>A graded list of 159 hotspots, made before the monsoon (<A href={TRIB_159}>Tribune, Apr 2026</A>)</>,
    agrim: "The same list, ranked again before every storm from forecast rain, terrain and drainage" },
  { topic: "When to act",
    today: <>155 points watched round the clock, an officer for each; the control room learns of flooding from field reports and complaints (<A href={TRIB_WATCH}>Tribune, Jul 2026</A>)</>,
    agrim: "A ranked Red and Amber list 24 hours before the rain, with a T-24 to T+24 checklist per zone" },
  { topic: "Pumps",
    today: <>141 heavy-duty pumps and 77 suction tankers (<A href={LOK_SABHA}>Lok Sabha reply</A>)</>,
    agrim: "Orders say which spots get a pump first (Red) and which keep one on standby (Amber)" },
  { topic: "Drains",
    today: <>544 km of drains desilted (<A href={LOK_SABHA}>Lok Sabha reply, Aug 2025</A>)</>,
    agrim: "Critical points: the outfalls that relieve the most hotspots, to clear first" },
  { topic: "After the storm",
    today: <>Lists of waterlogged locations, such as 154 after one storm (<A href={TRIB_154}>Tribune, May 2025</A>)</>,
    agrim: "A report per hotspot, flooded or clear, which builds a public scorecard and the data to train the model" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-10 md:px-10 md:pt-14">
      <h1 className="h-page">Agrim is a flood early-warning prototype for Gurugram, built for SustainX 2026.</h1>
      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-12 md:grid-cols-[minmax(0,1fr)_360px]">
        <section className="max-w-[65ch] space-y-5 text-[16px] leading-[1.7] text-ink-2">
          <p>
            India's weather services forecast rain. Agrim takes the next step: it forecasts which of Gurugram's waterlogging
            hotspots will flood in the next 24 to 48 hours, says how sure it is, and turns that into orders for the
            Municipal Corporation of Gurugram's crews, following their monsoon SOP.
          </p>
          <p>
            It runs on public data today: three global weather models, each hotspot's rain record since 2018, elevation,
            mapped drains and land cover. It's built to take MCG's own data (the full hotspot list, post-storm records and
            rain gauges) the day it's shared. What it needs and why is on the Data & assumptions page.
          </p>
          <p>
            Two rules shaped it: never present anything made up as real, and say plainly what the system can't do yet.
          </p>
        </section>
        <aside className="self-start rounded-card border border-rule bg-paper-3 p-6">
          <h2 className="h-sub">Team</h2>
          <p className="mt-4 text-[22px] font-display font-medium leading-tight tracking-[-0.02em]">Varun Tuteja</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Solo builder: product and design, data pipeline and drainage model, risk model, API, web app and deployment.
          </p>
          <div className="mt-5 space-y-2 border-t border-rule pt-4 text-[14px]">
            <a className="link block" href="https://github.com/varuntutejaa/Agrim" target="_blank" rel="noreferrer">Code: github.com/varuntutejaa/Agrim</a>
            <a className="link block" href="https://agrim-api.onrender.com/docs" target="_blank" rel="noreferrer">API documentation</a>
          </div>
        </aside>
      </div>

      <section className="mt-16">
        <h2 className="h-sub">How MCG works today, and with Agrim</h2>
        <p className="mt-2 max-w-[68ch] text-[14px] text-muted">
          Today, from public reports (linked); MCG's own SOP may say more. Agrim is a pilot and doesn't replace any of it.
        </p>
        <div className="mt-4 hidden border-b border-rule pb-2 md:grid md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)] md:gap-x-6" role="presentation">
          <span className="label">Task</span><span className="label">Today</span><span className="label">With Agrim</span>
        </div>
        <ul className="m-0 mt-4 list-none border-t border-rule p-0 md:mt-0 md:border-t-0">
          {TODAY_VS_AGRIM.map((r) => (
            <li key={r.topic} className="grid gap-y-1.5 border-b border-rule py-4 text-[14px] leading-relaxed md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)] md:gap-x-6">
              <span className="font-semibold text-ink">{r.topic}</span>
              <span className="text-ink-2"><span className="label md:hidden">Today: </span>{r.today}</span>
              <span className="text-ink-2"><span className="label md:hidden">With Agrim: </span>{r.agrim}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
