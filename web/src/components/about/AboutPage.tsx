// Who built Agrim and what it is.

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
        <aside className="self-start border-2 border-ink bg-paper-3 p-6">
          <h2 className="h-sub">Team</h2>
          <p className="mt-4 text-[22px] font-extrabold leading-tight tracking-[-0.03em]">Varun Tuteja</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Solo builder: product and design, data pipeline and drainage model, risk model, API, web app and deployment.
          </p>
          <div className="mt-5 space-y-2 border-t-2 border-ink pt-4 text-[14px]">
            <a className="link block" href="https://github.com/varuntutejaa/Agrim" target="_blank" rel="noreferrer">Code: github.com/varuntutejaa/Agrim</a>
            <a className="link block" href="https://agrim-api.onrender.com/docs" target="_blank" rel="noreferrer">API documentation</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
