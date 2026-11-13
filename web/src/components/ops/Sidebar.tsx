// Right-hand column of the desk: the order sheet / crew SMS, and the logs.
import { useState } from "react";
import type { AlertRecord, FeedbackRecord, Orders, OverrideRecord, RiskLevel, Scorecard } from "../../types";
import { LEVEL_LABEL } from "../../risk";
import { TextTabs } from "../ui";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

/** A level as a small status plate; tolerant of a missing level. */
function Level({ level }: { level?: RiskLevel | null }) {
  if (!level) return <span className="text-muted">?</span>;
  return <span className={`status status--${level}`}>{LEVEL_LABEL[level]}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="link text-[13px]"
      onClick={() => navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function OrdersCard({ orders }: { orders: Orders | null }) {
  const [tab, setTab] = useState<"sheet" | "sms">("sheet");
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="h-sub">Orders</h2>
        <TextTabs label="Orders format" value={tab} onChange={setTab}
          options={[{ key: "sheet" as const, label: "Order sheet" }, { key: "sms" as const, label: `Crew SMS${orders ? ` (${orders.sms.length})` : ""}` }]} />
      </div>
      {!orders ? (
        <div className="mt-3 h-40 bg-paper-2" aria-label="Loading" />
      ) : tab === "sheet" ? (
        <div className="mt-3 rounded-card border border-rule bg-paper-3">
          <pre className="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap p-3 text-[13px] leading-relaxed text-ink">{orders.text}</pre>
          <div className="flex justify-end border-t border-rule px-3 py-2"><CopyButton text={orders.text} /></div>
        </div>
      ) : orders.sms.length === 0 ? (
        <p className="mt-3 text-[14px] text-muted">No crew messages: nothing is at risk.</p>
      ) : (
        <ul className="m-0 mt-3 max-h-[400px] list-none overflow-auto border-y border-rule p-0">
          {orders.sms.map((s) => (
            <li key={s.hotspot_id} className="border-b border-rule py-2.5 last:border-b-0">
              <Level level={s.level} />
              <p className="mt-2 rounded-inner bg-well px-3 py-2.5 text-[13px] leading-relaxed text-well-ink">{s.text}</p>
              <div className="mt-1 flex justify-between text-[13px] text-muted">
                <span>{s.text.length}/160</span>
                <CopyButton text={s.text} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[13px] text-muted">Copy and send through your usual channel. Automatic SMS comes in milestone 7, sandbox only.</p>
    </section>
  );
}

export function OverrideLog({ items, names }: { items: OverrideRecord[]; names: Record<string, string> }) {
  return (
    <section>
      <h2 className="h-sub">Override log</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-muted">No overrides yet.</p>
      ) : (
        <ul className="m-0 mt-3 list-none border-y border-rule p-0">
          {items.slice(0, 12).map((o) => (
            <li key={o.id} className={`border-b border-rule py-2.5 text-[13px] last:border-b-0 ${o.revoked_at ? "opacity-55" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold">{names[o.hotspot_id] ?? o.hotspot_id}</span>
                <span className="text-muted">{when(o.created_at)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-ink-2">
                <Level level={o.model_level} />
                <span aria-label="changed to">→</span>
                <Level level={o.new_level} />
                <span>by {o.officer}</span>
                {o.is_exercise && <span className="font-medium text-ink">(exercise)</span>}
                {o.revoked_at && <span className="text-muted">(cancelled by {o.revoked_by})</span>}
              </div>
              <div className="mt-1 text-muted">“{o.reason}”</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FeedbackLog({ items, names }: { items: FeedbackRecord[]; names: Record<string, string> }) {
  return (
    <section>
      <h2 className="h-sub">Reports after the rain</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-muted">No reports yet. Each one is a real data point for checking and training the model.</p>
      ) : (
        <ul className="m-0 mt-3 list-none border-y border-rule p-0">
          {items.slice(0, 12).map((f) => (
            <li key={f.id} className="border-b border-rule py-2.5 text-[13px] last:border-b-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold">{names[f.hotspot_id] ?? f.hotspot_id}</span>
                <span className="text-muted">{f.event_date}</span>
              </div>
              <div className="mt-1 text-ink-2">
                {f.flooded ? `Flooded${f.depth && f.depth !== "unknown" ? `, ${f.depth}-deep` : ""}${f.duration_hours != null ? `, ${f.duration_hours} h` : ""}` : "Stayed clear"}.
                {" "}Agrim said {f.predicted_level ? LEVEL_LABEL[f.predicted_level as RiskLevel] ?? f.predicted_level : "n/a"}. Reported by {f.officer}.
              </div>
              {f.notes && <div className="mt-1 text-muted">{f.notes}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ScorecardCard({ card }: { card: Scorecard | null }) {
  if (!card) return null;
  const pct = (v: number | null | undefined) => (v == null ? "none yet" : `${Math.round(v * 100)}%`);
  return (
    <section>
      <h2 className="h-sub">Scorecard (live operations)</h2>
      {!card.available ? (
        <p className="mt-2 text-[14px] text-muted">Needs the database.</p>
      ) : (
        <>
          <dl className="m-0 mt-3 grid grid-cols-4 divide-x divide-rule border-y border-rule">
            {([
              ["Floods caught", card.counts!.hits],
              ["Floods missed", card.counts!.misses],
              ["False alarms", card.counts!.false_alarms],
              ["Correct all-clear", card.counts!.correct_clear],
            ] as const).map(([label, n]) => (
              <div key={label} className="px-2.5 py-3 first:pl-0">
                <dt className="text-[13px] font-medium text-ink-2">{label}</dt>
                <dd className="m-0 mt-1 text-[28px] font-display font-medium leading-none tracking-[-0.02em]">{n}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[14px] text-ink-2">
            Catches {pct(card.flood_catch_rate)} of reported floods; {pct(card.alarm_accuracy)} of alarms were right.
          </p>
          {card.overrides && card.overrides.length > 0 && (
            <ul className="m-0 mt-2 list-none space-y-1 p-0 text-[13px] text-ink-2">
              {card.overrides.slice(0, 6).map((o) => (
                <li key={o.id}>
                  Override #{o.id} ({o.model_level ?? "?"} to {o.new_level}):{" "}
                  {o.outcome == null ? <span className="text-muted">no report yet</span> : <>{o.outcome}; officer {o.officer_right ? "right" : "wrong"}, model {o.model_right == null ? "n/a" : o.model_right ? "right" : "wrong"}</>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[13px] text-muted">
            Built from officers' after-rain reports ({card.reports_total} so far; {card.reports_without_forecast} had no forecast on
            record). Exercises are excluded.
          </p>
        </>
      )}
    </section>
  );
}

export function AlertLog({ items, names }: { items: AlertRecord[]; names: Record<string, string> }) {
  return (
    <section>
      <h2 className="h-sub">Alert log</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-muted">No alerts sent yet.</p>
      ) : (
        <ul className="m-0 mt-3 list-none border-y border-rule p-0">
          {items.slice(0, 10).map((a) => (
            <li key={a.id} className="border-b border-rule py-2.5 text-[13px] last:border-b-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold">{names[a.hotspot_id] ?? a.hotspot_id}</span>
                <span className="text-muted">{when(a.created_at)}</span>
              </div>
              <dl className="m-0 mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-ink-2">
                <dt className="text-muted">Channel</dt><dd className="m-0">{a.channel}, to {a.recipient}</dd>
                <dt className="text-muted">Status</dt><dd className="m-0">{a.status}{a.is_exercise ? " (exercise)" : ""}</dd>
                <dt className="text-muted">Approved by</dt><dd className="m-0">{a.officer}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
