// The desk's main table: what each at-risk hotspot needs, by when, and what's done.
// Low-risk hotspots are folded away underneath.
import { useState } from "react";
import type { CheckItem, CheckTick, HotspotRisk, OrderItem, RiskLevel, RiskWindowKey } from "../../types";
import { LEVEL_COLOR, LEVEL_LONG, confidenceLabel } from "../../risk";
import { done } from "./SopTimeline";
import { FeedbackForm, OverrideForm } from "./Forms";

type Scored = Extract<HotspotRisk, { scored: true }>;
type Panel = "override" | "feedback";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", hour: "numeric", hour12: true }).replace(",", "");
const zoneOf = (h: HotspotRisk) => h.zone?.trim() || "Unassigned";

type Props = {
  hotspots: HotspotRisk[];
  windowKey: RiskWindowKey;
  items: OrderItem[];
  ticks: CheckTick[];
  canAct: boolean;
  onTick: (h: Scored, item: CheckItem, value: boolean) => void;
  onOverride: (h: Scored, level: RiskLevel, reason: string, hours: number) => Promise<void>;
  onRevoke: (overrideId: number) => Promise<void>;
  onFeedback: (h: Scored, f: Parameters<Parameters<typeof FeedbackForm>[0]["onSave"]>[0]) => Promise<void>;
};

function Check({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={`flex h-3.5 w-3.5 items-center justify-center border border-ink ${checked ? "bg-ink text-paper" : "bg-paper"}`}>
        {checked && <svg viewBox="0 0 10 10" className="h-2.5 w-2.5"><path d="M1.5 5.2 4 7.6 8.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>}
      </span>
      {label}
    </button>
  );
}

export default function ActionTable(p: Props) {
  const [open, setOpen] = useState<{ id: string; panel: Panel } | null>(null);
  const [showLow, setShowLow] = useState(false);
  const scored = p.hotspots.filter((h): h is Scored => h.scored);
  const atRisk = scored.filter((h) => h.windows[p.windowKey].level !== "green");
  const low = scored.filter((h) => h.windows[p.windowKey].level === "green");
  const itemFor = (id: string) => p.items.find((i) => i.hotspot_id === id);
  const toggle = (id: string, panel: Panel) => setOpen((o) => (o?.id === id && o.panel === panel ? null : { id, panel }));

  const row = (h: Scored) => {
    const w = h.windows[p.windowKey];
    const item = itemFor(h.id);
    const zone = zoneOf(h);
    const red = w.level === "red";
    const isOpen = open?.id === h.id;
    return (
      <li key={h.id} className={`border-b border-rule ${isOpen ? "bg-paper-2" : ""}`}>
        <div className="grid grid-cols-1 gap-y-2 py-3 md:grid-cols-[minmax(0,1.5fr)_140px_120px_minmax(0,1.6fr)_150px] md:items-center md:gap-x-4">
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-medium">{h.name}</div>
            <div className="truncate text-[11.5px] text-ink-3" title={w.drivers[0]}>
              {zone === "Unassigned" ? "Zone not set" : `Zone ${zone}`} · {w.drivers[0]}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: LEVEL_COLOR[w.level] }}>
              <span className="inline-block h-2 w-2" style={{ background: LEVEL_COLOR[w.level] }} />
              {LEVEL_LONG[w.level]}
            </div>
            <div className="font-mono text-[11px] text-ink-3">
              {w.override ? `MCG override (model: ${w.model_level})` : confidenceLabel(w) ?? ""}
            </div>
          </div>
          <div className="font-mono text-[12px]">
            {item && w.level !== "green" ? (
              <>
                <span className="kicker block !text-[10px]">Ready by</span>
                {new Date(item.t12) <= new Date() ? <span className="text-risk-red">Now</span> : fmt(item.t12)}
              </>
            ) : <span className="text-ink-3">–</span>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {w.level !== "green" && (
              <>
                <Check label="Gullies cleared" checked={done(p.ticks, zone, h.id, "gullies_cleared")} disabled={!p.canAct}
                  onChange={(v) => p.onTick(h, "gullies_cleared", v)} />
                <Check label={red ? "Pump placed" : "Pump on standby"} checked={done(p.ticks, zone, h.id, "pump_moved")} disabled={!p.canAct}
                  onChange={(v) => p.onTick(h, "pump_moved", v)} />
                {red && <Check label="Pump tested" checked={done(p.ticks, zone, h.id, "pump_tested")} disabled={!p.canAct}
                  onChange={(v) => p.onTick(h, "pump_tested", v)} />}
              </>
            )}
          </div>
          <div className="flex gap-4 text-[12.5px] md:justify-end">
            <button className={`underline-offset-4 hover:underline ${isOpen && open.panel === "override" ? "font-medium underline" : "text-ink-2"}`}
              onClick={() => toggle(h.id, "override")}>Override</button>
            <button className={`underline-offset-4 hover:underline ${isOpen && open.panel === "feedback" ? "font-medium underline" : "text-ink-2"}`}
              onClick={() => toggle(h.id, "feedback")}>Report</button>
          </div>
        </div>
        {isOpen && (
          <div className="mb-3 border-t border-rule pt-3 md:ml-0 md:max-w-[640px]">
            {open.panel === "override" ? (
              <OverrideForm h={h} windowKey={p.windowKey} disabled={!p.canAct}
                onSave={(l, r, hrs) => p.onOverride(h, l, r, hrs).then(() => setOpen(null))} onRevoke={p.onRevoke} />
            ) : (
              <FeedbackForm disabled={!p.canAct} onSave={(f) => p.onFeedback(h, f).then(() => setOpen(null))} />
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      <div className="hidden border-b border-ink pb-1.5 md:grid md:grid-cols-[minmax(0,1.5fr)_140px_120px_minmax(0,1.6fr)_150px] md:gap-x-4">
        <span className="kicker">Hotspot</span>
        <span className="kicker">Status</span>
        <span className="kicker">Deadline</span>
        <span className="kicker">Done</span>
        <span className="kicker md:text-right">Officer</span>
      </div>
      {atRisk.length === 0 && (
        <p className="border-b border-rule py-4 text-[14px] text-ink-2">No hotspot needs action in this view.</p>
      )}
      <ol>{atRisk.map(row)}</ol>
      {low.length > 0 && (
        <>
          <button onClick={() => setShowLow((s) => !s)} className="mt-3 text-[13px] text-ink-2 underline-offset-4 hover:underline">
            {showLow ? "Hide" : "Show"} {low.length} low-risk hotspots
          </button>
          {showLow && <ol className="mt-2 border-t border-rule">{low.map(row)}</ol>}
        </>
      )}
    </div>
  );
}
