// The SOP as a route: T-24 orders, T-12 gullies and pumps, T-3 pump test,
// rain, T+24 report. Each step is a bordered cell with its deadline and how much is done.
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
  if (!orders) return <div className="h-[112px] bg-paper-2" aria-label="Loading" />;
  const items = orders.items;
  if (!items.length) {
    return (
      <p className="rounded-card border border-rule bg-paper-3 px-4 py-4 text-[15px] leading-relaxed text-ink-2">
        Nothing to prepare: every hotspot in this view is low risk. The SOP steps appear here when a hotspot turns Red or Amber.
      </p>
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
    <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-5">
      {steps.map((s) => {
        const complete = s.total > 0 && s.done >= s.total;
        return (
          <li key={s.tag} className={`rounded-inner border bg-paper-2 px-3 py-3 ${complete ? "border-accent" : "border-rule"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[18px] font-display font-medium tracking-[-0.02em]">{s.tag}</span>
              {s.when && <span className={`text-[13px] text-muted`}>{fmt(s.when)}</span>}
            </div>
            <div className={`mt-1 text-[14px] leading-snug text-ink-2`}>{s.title}</div>
            {s.total > 0 ? (
              <>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-rule" role="img" aria-label={`${s.done} of ${s.total} done`}>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(s.done / s.total) * 100}%` }} />
                </div>
                <div className={`mt-1.5 text-[13px] font-medium ${complete ? "text-accent" : "text-muted"}`}>
                  {complete ? "Done" : `${s.done} of ${s.total}`}
                </div>
              </>
            ) : (
              <div className="mt-[22px] text-[13px] text-muted">{s.note ?? "No checks"}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
