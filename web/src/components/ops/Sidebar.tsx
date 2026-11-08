// Right-hand column of the desk: the order sheet / crew SMS, and the logs.
import { useState } from "react";
import type { AlertRecord, FeedbackRecord, Orders, OverrideRecord, Scorecard } from "../../types";
import { LEVEL_COLOR } from "../../risk";
import { Kicker, TextTabs } from "../ui";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="text-[12px] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
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
      <div className="flex items-center justify-between">
        <Kicker>Orders</Kicker>
        <TextTabs label="Orders format" value={tab} onChange={setTab}
          options={[{ key: "sheet" as const, label: "Order sheet" }, { key: "sms" as const, label: `Crew SMS${orders ? ` (${orders.sms.length})` : ""}` }]} />
      </div>
      {!orders ? (
        <div className="mt-2 h-40 animate-pulse bg-paper-2" />
      ) : tab === "sheet" ? (
        <div className="mt-2 border border-ink bg-paper-2">
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap p-3 font-mono text-[12px] leading-relaxed text-ink">{orders.text}</pre>
          <div className="flex justify-end border-t border-rule px-3 py-1.5"><CopyButton text={orders.text} /></div>
        </div>
      ) : orders.sms.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-3">No crew messages: nothing is at risk.</p>
      ) : (
        <ul className="mt-2 max-h-[400px] space-y-2 overflow-auto">
          {orders.sms.map((s) => (
            <li key={s.hotspot_id} className="border-l-2 bg-paper-2 py-2 pl-3 pr-2" style={{ borderColor: LEVEL_COLOR[s.level] }}>
              <p className="font-mono text-[12px] leading-snug">{s.text}</p>
              <div className="mt-1 flex justify-between font-mono text-[10.5px] text-ink-3">
                <span>{s.text.length}/160</span>
                <CopyButton text={s.text} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11.5px] text-ink-3">Copy and send through your usual channel. Automatic SMS comes in milestone 7, sandbox only.</p>
    </section>
  );
}

export function OverrideLog({ items, names }: { items: OverrideRecord[]; names: Record<string, string> }) {
  return (
    <section>
      <Kicker>Override log</Kicker>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-3">No overrides yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {items.slice(0, 12).map((o) => (
            <li key={o.id} className={`py-2 text-[12.5px] ${o.revoked_at ? "opacity-55" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{names[o.hotspot_id] ?? o.hotspot_id}</span>
                <span className="font-mono text-[10.5px] text-ink-3">{when(o.created_at)}</span>
              </div>
              <div className="text-ink-2">
                <span style={{ color: o.model_level ? LEVEL_COLOR[o.model_level] : undefined }}>{o.model_level ?? "?"}</span>
                {" → "}
                <span className="font-medium" style={{ color: LEVEL_COLOR[o.new_level] }}>{o.new_level}</span>
                {" · "}{o.officer}{o.is_exercise && <span className="kicker ml-1.5 !text-[10px]">Exercise</span>}
                {o.revoked_at && <span className="ml-1.5 text-ink-3">(cancelled by {o.revoked_by})</span>}
              </div>
              <div className="text-ink-3">"{o.reason}"</div>
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
      <Kicker>Reports after the rain</Kicker>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-3">No reports yet. Each one is a real data point for checking and training the model.</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {items.slice(0, 12).map((f) => (
            <li key={f.id} className="py-2 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{names[f.hotspot_id] ?? f.hotspot_id}</span>
                <span className="font-mono text-[10.5px] text-ink-3">{f.event_date}</span>
              </div>
              <div className="text-ink-2">
                {f.flooded ? `Flooded${f.depth && f.depth !== "unknown" ? `, ${f.depth}-deep` : ""}${f.duration_hours != null ? `, ${f.duration_hours} h` : ""}` : "Stayed clear"}
                {" · "}Agrim said {f.predicted_level ? <span style={{ color: LEVEL_COLOR[f.predicted_level] }}>{f.predicted_level}</span> : "n/a"}
                {" · "}{f.officer}
              </div>
              {f.notes && <div className="text-ink-3">{f.notes}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ScorecardCard({ card }: { card: Scorecard | null }) {
  if (!card) return null;
  const pct = (v: number | null | undefined) => (v == null ? "–" : `${Math.round(v * 100)}%`);
  return (
    <section>
      <Kicker>Scorecard (live operations)</Kicker>
      {!card.available ? (
        <p className="mt-2 text-[13px] text-ink-3">Needs the database.</p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 border-t border-ink">
            {([
              ["Floods caught", card.counts!.hits, "hits"],
              ["Floods missed", card.counts!.misses, "misses"],
              ["False alarms", card.counts!.false_alarms, "false alarms"],
              ["Correct all-clear", card.counts!.correct_clear, "correct"],
            ] as const).map(([label, n]) => (
              <div key={label} className="border-b border-rule py-2 pr-2 odd:border-r odd:pr-3 even:pl-3">
                <div className="kicker !text-[10px]">{label}</div>
                <div className="font-mono tabular text-[22px] leading-none">{n}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-2">
            Catches {pct(card.flood_catch_rate)} of reported floods; {pct(card.alarm_accuracy)} of alarms were right.
          </p>
          {card.overrides && card.overrides.length > 0 && (
            <ul className="mt-2 space-y-1 text-[12px] text-ink-2">
              {card.overrides.slice(0, 6).map((o) => (
                <li key={o.id}>
                  Override #{o.id} ({o.model_level ?? "?"} → {o.new_level}):{" "}
                  {o.outcome == null ? <span className="text-ink-3">no report yet</span> : <>{o.outcome}; officer {o.officer_right ? "right" : "wrong"}, model {o.model_right == null ? "n/a" : o.model_right ? "right" : "wrong"}</>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11.5px] text-ink-3">
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
      <Kicker>Alert log</Kicker>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-3">No alerts sent yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {items.slice(0, 10).map((a) => (
            <li key={a.id} className="py-2 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{names[a.hotspot_id] ?? a.hotspot_id}</span>
                <span className="font-mono text-[10.5px] text-ink-3">{when(a.created_at)}</span>
              </div>
              <div className="text-ink-2">
                {a.channel} · {a.recipient} · <span className="font-mono">{a.status}</span> · approved by {a.officer}
                {a.is_exercise && <span className="kicker ml-1.5 !text-[10px]">Exercise</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
