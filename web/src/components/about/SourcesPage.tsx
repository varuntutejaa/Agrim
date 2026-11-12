// Every data source and credit in one place (full detail: docs/SOURCES.md).
import type { ReactNode } from "react";
import { Kicker } from "../ui";

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-2 hover:decoration-ink">{children}</a>
);

const DATA: [string, ReactNode, string][] = [
  ["Rain forecast", <><A href="https://open-meteo.com/">Open-Meteo</A>: ECMWF IFS, NOAA GFS, DWD ICON</>, "CC BY 4.0"],
  ["Rain record 2018–2026", <><A href="https://open-meteo.com/en/docs/historical-weather-api">Open-Meteo archive</A>: ECMWF IFS analysis, ECMWF ERA5</>, "CC BY 4.0; ERA5 © Copernicus Climate Change Service"],
  ["Elevation", <><A href="https://registry.opendata.aws/copernicus-dem/">Copernicus DEM GLO-30</A></>, "© DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the EU and ESA"],
  ["Built-up land", <><A href="https://esa-worldcover.org/">ESA WorldCover 2021</A></>, "© ESA WorldCover project / Copernicus Sentinel data, CC BY 4.0"],
  ["Drains, roads, underpasses, place search", <><A href="https://www.openstreetmap.org/copyright">OpenStreetMap</A> via Nominatim and Overpass</>, "© OpenStreetMap contributors, ODbL"],
  ["Base map", <><A href="https://openfreemap.org/">OpenFreeMap</A>, <A href="https://openmaptiles.org/">OpenMapTiles</A></>, "© OpenMapTiles © OpenStreetMap contributors"],
  ["Flood event dates (district)", <><A href="https://zenodo.org/records/11275211">India Flood Inventory</A>, Saharia et al., IIT Delhi</>, "CC BY 4.0"],
];

const NEWS: [string, string][] = [
  ["MCG's 155-point watch list and zones", "https://www.tribuneindia.com/news/gurugram/gurugram-municipal-corporation-puts-155-flood-points-under-24-hour-watch/"],
  ["MCG's 159 graded hotspots", "https://www.tribuneindia.com/news/gurugram/gurugram-flags-159-waterlogging-hotspots-ahead-of-monsoon-haryana-pushes-zero-flood-plan/"],
  ["Lok Sabha reply: Aravalli–Najafgarh gradient, pumps, desilting", "https://www.tribuneindia.com/news/haryana/natural-gradient-between-aravallis-najafgarh-drain-behind-ggram-flooding-centre-in-ls"],
  ["MCG's 8-zone structure", "https://www.tribuneindia.com/news/delhi/mcg-expands-cluster-zone-system-to-boost-civic-services-in-gurugram/"],
  ["154 locations waterlogged after one storm", "https://www.tribuneindia.com/news/haryana/rain-unmasks-civic-lapses-gurugram-reports-waterlogging-at-154-locations"],
  ["District rain-gauge totals, 1 Sep 2025", "https://www.republicworld.com/amp/india/gurugram-rain-video-shows-submerged-roads-of-patel-nagar"],
];

const SOFTWARE = "FastAPI, Uvicorn, APScheduler, psycopg, pandas, NumPy, rasterio, pysheds, GeoPandas, Shapely, NetworkX, scikit-learn, XGBoost, React, Vite, TypeScript, Tailwind CSS, MapLibre GL";

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-6 md:px-8">
      <Kicker>Sources & credits</Kicker>
      <h1 className="mt-1 max-w-[820px] font-display text-[30px] font-medium leading-[1.12] md:text-[36px]">
        Every number in Agrim comes from one of these sources, or is marked as illustrative.
      </h1>

      <section className="mt-8">
        <Kicker className="mb-2">Data</Kicker>
        <ul className="divide-y divide-rule border-y border-ink">
          {DATA.map(([what, src, lic]) => (
            <li key={what} className="grid gap-1 py-2.5 text-[13.5px] md:grid-cols-[220px_1fr_minmax(0,1fr)] md:gap-4">
              <span className="font-medium">{what}</span><span className="text-ink-2">{src}</span><span className="text-[12px] text-ink-3">{lic}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-9 grid gap-10 md:grid-cols-2">
        <div>
          <Kicker className="mb-2">News and official statements used</Kicker>
          <ul className="space-y-1.5 text-[13.5px]">
            {NEWS.map(([t, u]) => <li key={u}><A href={u}>{t}</A></li>)}
          </ul>
          <p className="mt-3 text-[12.5px] text-ink-3">
            The 48 candidate flood reports each carry their own article link (The Tribune, ThePrint / PTI, The Week / PTI,
            Careers360 / PTI, Republic World) and are reviewed by a person before use.
          </p>
        </div>
        <div>
          <Kicker className="mb-2">Illustrative content (clearly marked)</Kicker>
          <ul className="space-y-1.5 text-[13.5px] text-ink-2">
            <li>Simulated storms and replays: labelled EXERCISE / अभ्यास.</li>
            <li>Proposed sensor sites: labelled "Proposed (illustrative)".</li>
            <li>The Narsinghpur route tip in alerts: from the project brief's example.</li>
          </ul>
          <Kicker className="mb-2 mt-6">Open-source software</Kicker>
          <p className="text-[13px] text-ink-2">{SOFTWARE}.</p>
          <Kicker className="mb-2 mt-6">Fonts</Kicker>
          <p className="text-[13px] text-ink-2">Newsreader and IBM Plex (Sans, Mono, Devanagari), SIL Open Font License.</p>
          <Kicker className="mb-2 mt-6">Hosting</Kicker>
          <p className="text-[13px] text-ink-2">Vercel (web), Render (API), Neon (database), GitHub (code and scheduled jobs).</p>
        </div>
      </section>
    </div>
  );
}
