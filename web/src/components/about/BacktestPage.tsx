// How the rules would have done on past floods: reviewed reports only.
import { useEffect, useState } from "react";
import { fetchBacktest } from "../../api";
import type { Backtest } from "../../types";
import { LEVEL_LABEL } from "../../risk";

const REASON_TEXT: Record<string, string> = {
  "model saw little rain": "The weather model's rain that day was ordinary for this spot, so the rules couldn't see the storm. Typical of a short, local cloudburst that 9 to 25 km models smooth out.",
  "model saw moderate rain": "The model saw a wet day, but nowhere near the extreme rain reported on the ground. Again the model under-read a local burst.",
  "model saw extreme rain": "The model saw extreme rain, yet this spot still scored below the line: a weakness of the rules here.",
};

export default function BacktestPage() {
  const [bt, setBt] = useState<Backtest | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetchBacktest().then(setBt).catch(() => setErr(true)); }, []);

  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-10 md:px-10 md:pt-14">
      {err && <p className="text-[15px] font-semibold text-risk-red">Couldn't load the backtest.</p>}
      {!bt && !err && <div className="h-40 bg-paper-2" aria-label="Loading" />}
      {bt && bt.n === 0 && (
        <>
          <h1 className="h-page">Not published yet: the backtest only uses flood reports a person has checked.</h1>
          <p className="mt-5 max-w-[65ch] text-[16px] leading-[1.7] text-ink-2">
            {bt.candidates_pending} news reports of past floods are waiting for review. Each one is opened, its date and
            place checked, and accepted or rejected. Then this page shows which floods the rules would have caught, which
            they missed, and why.
          </p>
          <pre className="plate mt-6 inline-block px-4 py-3 text-[14px]">python -m pipeline.review_candidates</pre>
        </>
      )}
      {bt && bt.n > 0 && (
        <>
          <h1 className="h-page">
            On {bt.counts.caught + bt.counts.missed} reviewed past floods, the rules would have raised the alarm for {bt.counts.caught}.
            Every miss shows why the next step is rain-gauge data.
          </h1>
          <dl className="m-0 mt-10 grid grid-cols-4 divide-x divide-rule border-y border-rule">
            {([["Caught", bt.counts.caught], ["Missed", bt.counts.missed], ["False alarms", bt.counts["false alarm"]], ["Correct all-clear", bt.counts.correct]] as const).map(([l, n]) => (
              <div key={l} className="px-3 py-4 first:pl-0 md:px-5">
                <dt className="text-[14px] font-medium text-ink-2">{l}</dt>
                <dd className="m-0 mt-2 text-[44px] font-display font-medium leading-none tracking-[-0.02em]">{n}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-16">
            <h2 className="h-sub">Why the misses happened</h2>
            <ul className="m-0 mt-4 list-none border-t border-rule p-0">
              {Object.entries(bt.miss_reasons).filter(([, n]) => n > 0).map(([r, n]) => (
                <li key={r} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-rule py-4">
                  <span className="text-[36px] font-display font-medium leading-none tracking-[-0.02em]">{n}</span>
                  <span className="max-w-[65ch] text-[15px] leading-relaxed text-ink-2"><b className="text-ink">{r[0].toUpperCase() + r.slice(1)}.</b> {REASON_TEXT[r]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-16">
            <h2 className="h-sub">By storm day</h2>
            <table className="mt-4 w-full border-collapse text-[14px]">
              <thead><tr className="border-b border-rule text-left">
                <th scope="col" className="label pb-2">Day</th><th scope="col" className="label pb-2">Model rain at the spots</th>
                <th scope="col" className="label pb-2 text-right">Caught</th><th scope="col" className="label pb-2 text-right">Missed</th>
              </tr></thead>
              <tbody>
                {bt.days.map((d) => (
                  <tr key={d.date} className="border-b border-rule">
                    <td className="py-2.5 font-medium">{new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>{d.model_rain_min.toFixed(0)} to {d.model_rain_max.toFixed(0)} mm</td>
                    <td className="text-right font-semibold">{d.caught}</td><td className="text-right font-semibold">{d.missed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <details className="mt-16">
            <summary className="cursor-pointer text-[16px] font-semibold">Every report ({bt.n})</summary>
            <ul className="m-0 mt-3 list-none border-y border-rule p-0">
              {bt.rows.map((r) => (
                <li key={`${r.date}-${r.hotspot_id}`} className="grid gap-1 border-b border-rule py-3 text-[14px] last:border-b-0 md:grid-cols-[120px_minmax(0,1fr)_180px_minmax(0,1fr)] md:items-center">
                  <span className="text-muted">{r.date}</span>
                  <span className="font-semibold">{r.name}</span>
                  <span className="flex items-center gap-2">
                    <span className={`status status--${r.level}`}>{LEVEL_LABEL[r.level]}</span>
                    <span>{r.outcome}</span>
                  </span>
                  <span className="text-ink-2">
                    Model {r.model_rain_mm} mm ({r.how_unusual}).
                    {r.source_url.startsWith("http") && <> <a className="link" href={r.source_url} target="_blank" rel="noreferrer">Source</a></>}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          <p className="mt-8 max-w-[72ch] text-[13px] leading-relaxed text-muted">{bt.note}</p>
        </>
      )}
    </div>
  );
}
