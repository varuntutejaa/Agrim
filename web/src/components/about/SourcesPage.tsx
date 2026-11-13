// Every data source and credit in one place (full detail: docs/SOURCES.md).
import type { ReactNode } from "react";

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="link">{children}</a>
);

const DATA: [string, ReactNode, string][] = [
  ["Rain forecast", <><A href="https://open-meteo.com/">Open-Meteo</A>: ECMWF IFS, NOAA GFS, DWD ICON</>, "CC BY 4.0"],
  ["Rain record 2018 to 2026", <><A href="https://open-meteo.com/en/docs/historical-weather-api">Open-Meteo archive</A>: ECMWF IFS analysis, ECMWF ERA5</>, "CC BY 4.0; ERA5 © Copernicus Climate Change Service"],
  ["Elevation", <><A href="https://registry.opendata.aws/copernicus-dem/">Copernicus DEM GLO-30</A></>, "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the EU and ESA"],
  ["Built-up land", <><A href="https://esa-worldcover.org/">ESA WorldCover 2021</A></>, "© ESA WorldCover project / Copernicus Sentinel data, CC BY 4.0"],
  ["Drains, roads, underpasses, place search", <><A href="https://www.openstreetmap.org/copyright">OpenStreetMap</A> via Nominatim and Overpass</>, "© OpenStreetMap contributors, ODbL"],
  ["Base map", <><A href="https://openfreemap.org/">OpenFreeMap</A>, <A href="https://openmaptiles.org/">OpenMapTiles</A></>, "© OpenMapTiles © OpenStreetMap contributors"],
  ["Flood event dates (district)", <><A href="https://zenodo.org/records/11275211">India Flood Inventory</A>, Saharia et al., IIT Delhi</>, "CC BY 4.0"],
];

const NEWS: [string, string][] = [
  ["MCG's 155-point watch list and zones", "https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/"],
  ["MCG's 159 graded hotspots", "https://www.tribuneindia.com/news/gurugram/gurugram-flags-159-waterlogging-hotspots-ahead-of-monsoon-haryana-pushes-zero-flood-plan/"],
  ["Lok Sabha reply: the Aravalli to Najafgarh gradient, pumps, desilting", "https://www.tribuneindia.com/news/haryana/natural-gradient-between-aravallis-najafgarh-drain-behind-ggram-flooding-centre-in-ls"],
  ["MCG's 8-zone structure", "https://www.tribuneindia.com/news/delhi/mcg-expands-cluster-zone-system-to-boost-civic-services-in-gurugram/"],
  ["154 locations waterlogged after one storm", "https://www.tribuneindia.com/news/haryana/rain-unmasks-civic-lapses-gurugram-reports-waterlogging-at-154-locations"],
  ["District rain-gauge totals, 1 Sep 2025", "https://www.republicworld.com/amp/india/gurugram-rain-video-shows-submerged-roads-of-patel-nagar"],
];

const SOFTWARE = "FastAPI, Uvicorn, APScheduler, psycopg, pandas, NumPy, rasterio, pysheds, GeoPandas, Shapely, NetworkX, scikit-learn, XGBoost, React, Vite, TypeScript, Tailwind CSS, MapLibre GL";

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-10 md:px-10 md:pt-14">
      <h1 className="h-page">Every number in Agrim comes from one of these sources, or is marked as illustrative.</h1>

      <section className="mt-12">
        <h2 className="h-sub">Data</h2>
        <div className="mt-4 hidden border-b-2 border-ink pb-2 md:grid md:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)] md:gap-6" role="presentation">
          <span className="label">What</span><span className="label">Source</span><span className="label">Licence</span>
        </div>
        <ul className="m-0 list-none border-t-2 border-ink p-0 md:border-t-0">
          {DATA.map(([what, src, lic]) => (
            <li key={what} className="grid gap-1 border-b border-rule py-3.5 text-[15px] md:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
              <span className="font-extrabold">{what}</span><span className="text-ink-2">{src}</span><span className="text-[13px] leading-relaxed text-muted">{lic}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-14 md:grid-cols-2">
        <div>
          <h2 className="h-sub">News and official statements used</h2>
          <ul className="m-0 mt-4 list-none space-y-2.5 border-t-2 border-ink p-0 pt-4 text-[15px]">
            {NEWS.map(([t, u]) => <li key={u}><A href={u}>{t}</A></li>)}
          </ul>
          <p className="mt-4 max-w-[65ch] text-[14px] leading-relaxed text-muted">
            The 48 candidate flood reports each carry their own article link (The Tribune, ThePrint / PTI, The Week / PTI,
            Careers360 / PTI, Republic World) and are reviewed by a person before use.
          </p>
        </div>
        <div className="space-y-10">
          <div>
            <h2 className="h-sub">Illustrative content (clearly marked)</h2>
            <ul className="m-0 mt-4 list-none space-y-2 border-t-2 border-ink p-0 pt-4 text-[15px] text-ink-2">
              <li>Simulated storms and replays: labelled Exercise / अभ्यास.</li>
              <li>Proposed sensor sites: labelled “Proposed, illustrative”.</li>
              <li>The Narsinghpur route tip in alerts: from the project brief's example.</li>
            </ul>
          </div>
          <dl className="m-0 grid gap-x-6 gap-y-4 border-t-2 border-ink pt-4 text-[15px] md:grid-cols-[180px_minmax(0,1fr)]">
            <dt className="font-extrabold">Open-source software</dt><dd className="m-0 text-ink-2">{SOFTWARE}.</dd>
            <dt className="font-extrabold">Fonts</dt><dd className="m-0 text-ink-2">Chivo Mono and IBM Plex Sans Devanagari, SIL Open Font License.</dd>
            <dt className="font-extrabold">Hosting</dt><dd className="m-0 text-ink-2">Vercel (web), Render (API), Neon (database), GitHub (code and scheduled jobs).</dd>
          </dl>
        </div>
      </section>
    </div>
  );
}
