// Large scenario label on the map, so a projected screen always says what is being shown.
import type { SimResult, StormParams } from "../types";

export default function MapStamp({ result, storm }: { result: SimResult | null; storm: StormParams }) {
  const meta = result?.meta;
  const replay = meta?.mode === "replay" ? meta.event ?? null : null;
  const replayDate = meta?.mode === "replay" ? String(meta.params.date) : null;
  return (
    <div className="pointer-events-none absolute left-3 top-10 border border-ink bg-paper/95 px-2.5 py-1.5 md:left-4 md:top-14 md:px-3.5 md:py-2.5">
      {replayDate ? (
        <>
          <div className="kicker hidden md:block">Replay · model rain</div>
          <div className="font-display text-[19px] font-medium leading-tight md:text-[30px]">
            {replay?.title ?? new Date(replayDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          {replay && <div className="hidden font-mono text-[11.5px] text-ink-2 md:block">city average {replay.city_mean_mm.toFixed(0)} mm · peak hour {replay.peak1h_mm.toFixed(0)} mm</div>}
        </>
      ) : (
        <>
          <div className="kicker hidden md:block">Scenario</div>
          <div className="font-mono tabular text-[19px] font-medium leading-tight md:text-[30px]">
            {storm.rain_24h}<span className="ml-1 text-[14px] text-ink-3">mm in 24 h</span>
          </div>
          <div className="hidden font-mono text-[11.5px] text-ink-2 md:block">
            peak {storm.peak1h} mm/h · {storm.centre ? `local storm, ${storm.radius_km} km` : "whole city"}
          </div>
        </>
      )}
    </div>
  );
}
