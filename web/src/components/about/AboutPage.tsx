// Who built Agrim and what it is.
import { Kicker } from "../ui";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-6 md:px-8">
      <Kicker>About</Kicker>
      <h1 className="mt-1 max-w-[820px] font-display text-[32px] font-medium leading-[1.1] md:text-[40px]">
        Agrim is a flood early-warning prototype for Gurugram, built for SustainX 2026.
      </h1>
      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 text-[14.5px] leading-relaxed text-ink-2">
          <p>
            India's weather services forecast rain. Agrim takes the next step: it forecasts which of Gurugram's waterlogging
            hotspots will flood in the next 24–48 hours, says how sure it is, and turns that into orders for the
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
        <aside className="border-t border-ink pt-3">
          <Kicker>Team</Kicker>
          <div className="mt-2 font-display text-[22px] font-medium">Varun Tuteja</div>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Solo builder: product and design, data pipeline and drainage model, risk model, API, web app and deployment.
          </p>
          <div className="mt-4 space-y-1 text-[13px]">
            <a className="block underline decoration-rule underline-offset-2 hover:decoration-ink" href="https://github.com/varuntutejaa/Agrim" target="_blank" rel="noreferrer">Code: github.com/varuntutejaa/Agrim</a>
            <a className="block underline decoration-rule underline-offset-2 hover:decoration-ink" href="https://agrim-api.onrender.com/docs" target="_blank" rel="noreferrer">API documentation</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
