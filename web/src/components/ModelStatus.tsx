// Tier B (machine-learning) status, told plainly: trained or not, on how many
// real flood reports, and how it did against the rules on storms it hadn't seen.
import { useEffect, useState } from "react";
import { fetchModelStatus } from "../api";
import type { ModelStatus as Status } from "../types";
import { Kicker } from "./ui";

const pct = (v: number | null | undefined) => (v == null ? "–" : `${Math.round(v * 100)}%`);

function Bar({ label, have, need }: { label: string; have: number; need: number }) {
  const share = Math.min(1, need ? have / need : 0);
  return (
    <div>
      <div className="flex justify-between text-[12px] text-ink-2">
        <span>{label}</span>
        <span className="font-mono tabular">{have} / {need}</span>
      </div>
      <div className="mt-1 h-[3px] bg-rule">
        <div className="h-full bg-ink" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

export default function ModelStatus() {
  const [st, setSt] = useState<Status | null>(null);
  useEffect(() => {
    fetchModelStatus().then(setSt).catch(() => {});
  }, []);
  if (!st) return null;

  if (st.status !== "trained") {
    const need = st.needs ?? { min_labels: 30, min_per_class: 8 };
    const usable = st.n_usable ?? 0;
    return (
      <section>
        <Kicker>Machine-learning model</Kicker>
        <p className="mt-1.5 text-[14px] text-ink">
          Not trained yet. It needs real flood reports to learn from, and there aren't enough.
        </p>
        <div className="mt-3 space-y-2.5">
          <Bar label="Usable flood reports" have={usable} need={need.min_labels} />
          <Bar label="…of which floods" have={st.n_floods ?? 0} need={need.min_per_class} />
          <Bar label="…of which stayed dry in rain" have={st.n_dry ?? 0} need={need.min_per_class} />
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-ink-3">
          The rules above work without it. Every sourced news report and every officer report from the MCG desk counts.
          {st.labels_now && st.labels_now.reports > usable && ` ${st.labels_now.reports} reports are waiting for the next training run.`}
        </p>
      </section>
    );
  }

  const m = st.model!, r = st.rules_baseline!;
  return (
    <section>
      <Kicker>Machine-learning model</Kicker>
      <p className="mt-1.5 text-[14px] text-ink">
        Trained on {st.n_usable} real reports ({st.n_floods} floods, {st.n_dry} dry) from {st.n_storm_days} storm days.
      </p>
      <table className="mt-3 w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="kicker pb-1 font-medium">On storms it hadn't seen</th>
            <th className="kicker pb-1 text-right font-medium">Model</th>
            <th className="kicker pb-1 text-right font-medium">Rules</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular">
          <tr className="border-b border-rule">
            <td className="py-1.5 font-sans text-ink-2">Floods caught</td>
            <td className="text-right">{pct(m.recall)}</td>
            <td className="text-right text-ink-2">{pct(r.recall)}</td>
          </tr>
          <tr className="border-b border-rule">
            <td className="py-1.5 font-sans text-ink-2">Alarms that were right</td>
            <td className="text-right">{pct(m.precision)}</td>
            <td className="text-right text-ink-2">{pct(r.precision)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-ink-3">
        Red/Amber/Green still come from the rules; the model adds a probability and its top three reasons.
        Probabilities are not calibrated yet.
      </p>
    </section>
  );
}
