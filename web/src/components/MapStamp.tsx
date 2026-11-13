// Large scenario sign on the map, so a projected screen always says what is being shown.
import type { SimResult, StormParams } from "../types";

export default function MapStamp({ result, storm }: { result: SimResult | null; storm: StormParams }) {
  const meta = result?.meta;
  const replay = meta?.mode === "replay" ? meta.event ?? null : null;
  const replayDate = meta?.mode === "replay" ? String(meta.params.date) : null;
  return (
    <div className="plate pointer-events-none absolute left-3 top-12 px-3 py-2 md:left-4 md:top-16 md:px-4 md:py-3">
      {replayDate ? (
        <>
          <div className="hidden text-[13px] text-paper-dim md:block">Replay, model rain</div>
          <div className="figure text-[20px] leading-tight tracking-[-0.03em] md:text-[30px]">
            {replay?.title ?? new Date(replayDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          {replay && (
            <div className="hidden text-[13px] text-paper-dim md:block">
              City average {replay.city_mean_mm.toFixed(0)} mm, peak hour {replay.peak1h_mm.toFixed(0)} mm
            </div>
          )}
        </>
      ) : (
        <>
          <div className="hidden text-[13px] text-paper-dim md:block">Scenario</div>
          <div className="text-[20px] leading-tight md:text-[32px]">
            <span className="figure tracking-[-0.03em]">{storm.rain_24h}</span>
            {"\u00a0"}<span className="text-[14px] font-medium text-paper">mm in 24 h</span>
          </div>
          <div className="hidden text-[13px] text-paper-dim md:block">
            Peak {storm.peak1h} mm/h, {storm.centre ? `local storm, ${storm.radius_km} km` : "whole city"}
          </div>
        </>
      )}
    </div>
  );
}
