// The desk's main table: what each at-risk hotspot needs, by when, and what's done.
// Low-risk hotspots are folded away underneath.
import { useState } from "react";
import type { CheckItem, CheckTick, HotspotRisk, OrderItem, RiskLevel, RiskWindowKey } from "../../types";
import { LEVEL_LABEL, confidenceLabel } from "../../risk";
import { done } from "./SopTimeline";
import { FeedbackForm, OverrideForm } from "./Forms";

type Scored = Extract<HotspotRisk, { scored: true }>;
type Panel = "override" | "feedback";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", hour: "numeric", hour12: true }).replace(",", "");
const zoneOf = (h: HotspotRisk) => h.zone?.trim() || "Unassigned";
const COLS = "md:grid-cols-[minmax(0,1.5fr)_150px_110px_minmax(0,1.6fr)_176px]";

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
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-8 items-center gap-2 whitespace-nowrap text-[13px] text-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className={`flex h-4 w-4 items-center justify-center border-2 border-ink ${checked ? "bg-ink text-paper" : "bg-paper-3"}`}>
        {checked && <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true"><path d="M1.5 5.2 4 7.6 8.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>}
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
        <div className={`grid grid-cols-1 gap-y-2 py-3 md:items-center md:gap-x-4 ${COLS}`}>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold">{h.name}</div>
            <div className="truncate text-[13px] text-muted" title={w.drivers[0]}>
              {zone === "Unassigned" ? "Zone not set" : `Zone ${zone}`}. {w.drivers[0]}
            </div>
          </div>
          <div>
            <span className={`status status--${w.level}`}>{LEVEL_LABEL[w.level]}</span>
            <div className="mt-1 text-[13px] text-muted">
              {w.override ? `MCG override (model: ${w.model_level})` : confidenceLabel(w) ?? ""}
            </div>
          </div>
          <div className="text-[14px]">
            {item && w.level !== "green" ? (
              <>
                <span className="label block">Ready by</span>
                {new Date(item.t12) <= new Date() ? <span className="font-extrabold text-risk-red">Now</span> : <span className="font-extrabold">{fmt(item.t12)}</span>}
              </>
            ) : <span className="text-muted">None</span>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
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
          <div className="cells md:justify-end">
            <button type="button" aria-pressed={isOpen && open.panel === "override"} className="cell btn--sm"
              onClick={() => toggle(h.id, "override")}>Override</button>
            <button type="button" aria-pressed={isOpen && open.panel === "feedback"} className="cell btn--sm"
              onClick={() => toggle(h.id, "feedback")}>Report</button>
          </div>
        </div>
        {isOpen && (
          <div className="mb-4 border-2 border-ink bg-paper-3 p-4 md:max-w-[680px]">
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
      <div className={`hidden border-b-2 border-ink pb-2 md:grid md:gap-x-4 ${COLS}`} role="presentation">
        <span className="label">Hotspot</span>
        <span className="label">Status</span>
        <span className="label">Deadline</span>
        <span className="label">Done</span>
        <span className="label md:text-right">Officer</span>
      </div>
      {atRisk.length === 0 && (
        <p className="border-b border-rule py-4 text-[15px] text-ink-2">No hotspot needs action in this view.</p>
      )}
      <ol className="m-0 list-none p-0">{atRisk.map(row)}</ol>
      {low.length > 0 && (
        <>
          <button type="button" onClick={() => setShowLow((s) => !s)} className="btn btn--sm mt-4" aria-expanded={showLow}>
            {showLow ? "Hide" : "Show"} {low.length} low-risk hotspots
          </button>
          {showLow && <ol className="m-0 mt-3 list-none border-t border-rule p-0">{low.map(row)}</ol>}
        </>
      )}
    </div>
  );
}
