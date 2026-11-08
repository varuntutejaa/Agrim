// The SOP as a timeline: T-24 orders, T-12 gullies and pumps, T-3 pump test,
// rain, T+24 report. Each step shows its deadline and how much is done.
import type { CheckTick, FeedbackRecord, Orders } from "../../types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", hour: "numeric", hour12: true }).replace(",", "");

type Step = { tag: string; title: string; when: string | null; done: number; total: number; note?: string };

export function done(ticks: CheckTick[], zone: string, hotspotId: string, item: CheckTick["item"]) {
  return ticks.some((t) => t.zone === zone && t.hotspot_id === hotspotId && t.item === item && t.done);
}

export default function SopTimeline({ orders, ticks, feedback, zoneKey }: {
  orders: Orders | null;
  ticks: CheckTick[];
  feedback: FeedbackRecord[];
  zoneKey: string;
}) {
  if (!orders) return <div className="h-[92px] animate-pulse bg-paper-2" />;
  const items = orders.items;
  if (!items.length) {
    return (
      <div className="border-y border-ink py-4 text-[14px] text-ink-2">
        Nothing to prepare: every hotspot in this view is low risk. The SOP steps appear here when a hotspot turns Red or Amber.
      </div>
    );
  }
  const reds = items.filter((i) => i.level === "red");
  const earliest = (key: "t12" | "t3" | "onset", list = items) =>
    list.length ? list.map((i) => i[key]).sort()[0] : null;
  const latestT24 = items.map((i) => i.t24).sort().at(-1) ?? null;
  const prepDone = items.filter((i) =>
    done(ticks, i.zone, i.hotspot_id, "gullies_cleared") && done(ticks, i.zone, i.hotspot_id, "pump_moved")).length;
  const tested = reds.filter((i) => done(ticks, i.zone, i.hotspot_id, "pump_tested")).length;
  const reported = items.filter((i) =>
    feedback.some((f) => f.hotspot_id === i.hotspot_id && f.created_at >= orders.issued_at)).length;

  const steps: Step[] = [
    { tag: "T-24 h", title: "Orders issued", when: orders.issued_at, done: ticks.some((t) => t.zone === zoneKey && t.item === "list_issued" && t.done) ? 1 : 0, total: 1 },
    { tag: "T-12 h", title: "Gullies cleared, pumps placed", when: earliest("t12"), done: prepDone, total: items.length },
    { tag: "T-3 h", title: "Pumps tested", when: earliest("t3", reds), done: tested, total: reds.length, note: reds.length ? undefined : "No Red spots" },
    { tag: "T 0", title: "Rain expected", when: earliest("onset"), done: 0, total: 0 },
    { tag: "T+24 h", title: "Reports in", when: latestT24, done: reported, total: items.length },
  ];

  return (
    <ol className="grid grid-cols-2 border-y border-ink md:grid-cols-5">
      {steps.map((s, i) => {
        const complete = s.total > 0 && s.done >= s.total;
        return (
          <li key={s.tag} className={`border-rule py-3 pr-3 md:border-r md:pl-3 md:last:border-r-0 md:first:pl-0 ${i % 2 ? "border-l pl-3 md:border-l-0" : ""} ${i > 1 ? "border-t md:border-t-0" : ""}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[12px] font-medium text-ink">{s.tag}</span>
              {s.when && <span className="font-mono text-[11px] text-ink-3">{fmt(s.when)}</span>}
            </div>
            <div className="mt-0.5 text-[13px] leading-snug text-ink-2">{s.title}</div>
            {s.total > 0 ? (
              <>
                <div className="mt-2 h-[3px] bg-rule">
                  <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${(s.done / s.total) * 100}%` }} />
                </div>
                <div className={`mt-1 font-mono text-[11.5px] ${complete ? "text-risk-green" : "text-ink-3"}`}>
                  {complete ? "Done" : `${s.done} of ${s.total}`}
                </div>
              </>
            ) : (
              <div className="mt-[17px] font-mono text-[11.5px] text-ink-3">{s.note ?? "–"}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
