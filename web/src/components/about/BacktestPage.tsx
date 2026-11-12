// How the rules would have done on past floods: reviewed reports only.
import { useEffect, useState } from "react";
import { fetchBacktest } from "../../api";
import type { Backtest } from "../../types";
import { LEVEL_COLOR, LEVEL_LABEL } from "../../risk";
import { Kicker } from "../ui";

const REASON_TEXT: Record<string, string> = {
  "model saw little rain": "The weather model's rain that day was ordinary for this spot, so the rules couldn't see the storm. Typical of a short, local cloudburst that 9–25 km models smooth out.",
  "model saw moderate rain": "The model saw a wet day, but nowhere near the extreme rain reported on the ground. Again the model under-read a local burst.",
  "model saw extreme rain": "The model saw extreme rain, yet this spot still scored below the line: a weakness of the rules here.",
};

export default function BacktestPage() {
  const [bt, setBt] = useState<Backtest | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetchBacktest().then(setBt).catch(() => setErr(true)); }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-6 md:px-8">
      <Kicker>Backtest</Kicker>
      {err && <p className="mt-3 text-[14px] text-risk-red">Couldn't load the backtest.</p>}
      {!bt && !err && <div className="mt-3 h-40 animate-pulse bg-paper-2" />}
      {bt && bt.n === 0 && (
        <>
          <h1 className="mt-1 max-w-[820px] font-display text-[30px] font-medium leading-[1.12] md:text-[36px]">
            Not published yet: the backtest only uses flood reports a person has checked.
          </h1>
          <p className="mt-3 max-w-[760px] text-[14.5px] leading-relaxed text-ink-2">
            {bt.candidates_pending} news reports of past floods are waiting for review. Each one is opened, its date and
            place checked, and accepted or rejected. Then this page shows which floods the rules would have caught, which
            they missed, and why.
          </p>
          <pre className="mt-4 inline-block border border-ink bg-paper-2 px-3 py-2 font-mono text-[12.5px]">python -m pipeline.review_candidates</pre>
        </>
      )}
      {bt && bt.n > 0 && (
        <>
          <h1 className="mt-1 max-w-[860px] font-display text-[30px] font-medium leading-[1.12] md:text-[36px]">
            On {bt.counts.caught + bt.counts.missed} reviewed past floods, the rules would have raised the alarm for {bt.counts.caught}.
            Every miss shows why the next step is rain-gauge data.
          </h1>
          <div className="mt-6 grid grid-cols-2 border-t border-ink md:grid-cols-4">
            {([["Caught", bt.counts.caught], ["Missed", bt.counts.missed], ["False alarms", bt.counts["false alarm"]], ["Correct all-clear", bt.counts.correct]] as const).map(([l, n]) => (
              <div key={l} className="border-b border-r border-rule px-3 py-3 first:pl-0">
                <div className="kicker">{l}</div>
                <div className="font-mono tabular text-[36px] font-medium leading-none">{n}</div>
              </div>
            ))}
          </div>

          <section className="mt-9">
            <Kicker className="mb-2">Why the misses happened</Kicker>
            <ul className="space-y-3">
              {Object.entries(bt.miss_reasons).filter(([, n]) => n > 0).map(([r, n]) => (
                <li key={r} className="grid grid-cols-[56px_1fr] gap-3 border-b border-rule pb-3">
                  <span className="font-mono text-[28px] leading-none">{n}</span>
                  <span className="text-[14px] text-ink-2"><b className="text-ink">{r[0].toUpperCase() + r.slice(1)}.</b> {REASON_TEXT[r]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-9">
            <Kicker className="mb-2">By storm day</Kicker>
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-ink text-left">
                <th className="kicker pb-1 font-medium">Day</th><th className="kicker pb-1 font-medium">Model rain at the spots</th>
                <th className="kicker pb-1 text-right font-medium">Caught</th><th className="kicker pb-1 text-right font-medium">Missed</th>
              </tr></thead>
              <tbody className="font-mono tabular">
                {bt.days.map((d) => (
                  <tr key={d.date} className="border-b border-rule">
                    <td className="py-1.5">{new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>{d.model_rain_min.toFixed(0)}–{d.model_rain_max.toFixed(0)} mm</td>
                    <td className="text-right">{d.caught}</td><td className="text-right">{d.missed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <details className="mt-9">
            <summary className="cursor-pointer kicker">Every report ({bt.n})</summary>
            <ul className="mt-2 divide-y divide-rule border-y border-rule">
              {bt.rows.map((r) => (
                <li key={`${r.date}-${r.hotspot_id}`} className="grid gap-1 py-2 text-[13px] md:grid-cols-[110px_1fr_120px_1fr]">
                  <span className="font-mono">{r.date}</span>
                  <span className="font-medium">{r.name}</span>
                  <span style={{ color: LEVEL_COLOR[r.level] }}>{r.outcome} · {LEVEL_LABEL[r.level]}</span>
                  <span className="text-ink-2">
                    model {r.model_rain_mm} mm ({r.how_unusual}){r.source_url.startsWith("http") && <> · <a className="underline" href={r.source_url} target="_blank" rel="noreferrer">source</a></>}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          <p className="mt-6 text-[12px] text-ink-3">{bt.note}</p>
        </>
      )}
    </div>
  );
}
