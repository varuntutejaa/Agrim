// Officer forms: override a hotspot's level, and report what happened after the rain.
import { useState } from "react";
import type { HotspotRisk, RiskLevel, RiskWindowKey } from "../../types";
import { LEVEL_BG, LEVEL_LONG } from "../../risk";
import { TextTabs } from "../ui";

export function OverrideForm({ h, windowKey, disabled, onSave, onRevoke }: {
  h: Extract<HotspotRisk, { scored: true }>;
  windowKey: RiskWindowKey;
  disabled: boolean;
  onSave: (level: RiskLevel, reason: string, hours: number) => Promise<void>;
  onRevoke: (overrideId: number) => Promise<void>;
}) {
  const w = h.windows[windowKey];
  const modelLevel = w.model_level ?? w.level;
  const [level, setLevel] = useState<RiskLevel>(w.level);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {w.override && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3 text-[14px]">
          <span>
            Overridden to <b>{LEVEL_LONG[w.level]}</b> by {w.override.officer}:{" "}
            <span className="text-ink-2">“{w.override.reason}”</span>
          </span>
          <button type="button" disabled={disabled || busy} onClick={run(() => onRevoke(w.override!.id))} className="btn btn--sm">
            Cancel override
          </button>
        </div>
      )}
      <fieldset className="m-0 border-0 p-0">
        <legend className="label mb-2 p-0">Set level (model says {LEVEL_LONG[modelLevel].toLowerCase()})</legend>
        <div className="cells flex-wrap">
          {(["red", "amber", "green"] as RiskLevel[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className="cell flex items-center gap-2"
            >
              <span className={`inline-block h-2.5 w-2.5 ${LEVEL_BG[l]}`} aria-hidden />
              {LEVEL_LONG[l]}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">Reason (what you know that the model doesn't)</span>
        <textarea className="field mt-1.5 h-20 w-full resize-none" maxLength={500} value={reason} name="reason"
          placeholder="e.g. Drain desilted yesterday; pump already on site" onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          Applies for
          <select className="field" value={hours} name="valid_hours" onChange={(e) => setHours(Number(e.target.value))}>
            {[6, 12, 24, 48, 72].map((n) => <option key={n} value={n}>{n} h</option>)}
          </select>
        </label>
        <button type="button" className="btn" disabled={disabled || busy || reason.trim().length < 10 || level === w.level}
          onClick={run(() => onSave(level, reason, hours))}>
          {busy ? "Saving…" : "Save override"}
        </button>
      </div>
    </div>
  );
}

export function FeedbackForm({ disabled, onSave }: {
  disabled: boolean;
  onSave: (f: { event_date: string; flooded: boolean; depth: string | null; duration_hours: number | null; notes: string | null }) => Promise<void>;
}) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [eventDate, setEventDate] = useState(today);
  const [flooded, setFlooded] = useState<"yes" | "no">("yes");
  const [depth, setDepth] = useState("knee");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        event_date: eventDate,
        flooded: flooded === "yes",
        depth: flooded === "yes" ? depth : null,
        duration_hours: hours === "" ? null : Number(hours),
        notes: notes.trim() || null,
      });
      setHours("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-[14px] text-ink-2">
          Date
          <input type="date" max={today} name="event_date" className="field" value={eventDate}
            onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-ink-2">Flooded?</span>
          <TextTabs label="Flooded" options={[{ key: "yes" as const, label: "Yes" }, { key: "no" as const, label: "No" }]} value={flooded} onChange={setFlooded} />
        </div>
      </div>
      {flooded === "yes" && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-2">Depth</span>
            <TextTabs label="Depth" value={depth} onChange={setDepth} options={[
              { key: "ankle", label: "Ankle" }, { key: "knee", label: "Knee" }, { key: "waist", label: "Waist" }, { key: "unknown", label: "Not sure" },
            ]} />
          </div>
          <label className="flex items-center gap-2 text-[14px] text-ink-2">
            Hours
            <input type="number" min={0} max={240} step={0.5} name="duration_hours" inputMode="decimal" className="field w-20"
              value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        </div>
      )}
      <textarea className="field h-16 w-full resize-none" maxLength={1000} name="notes" aria-label="Notes"
        placeholder="Notes (optional): what crews saw, whether the pump helped"
        value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end">
        <button type="button" className="btn" disabled={disabled || busy} onClick={save}>{busy ? "Saving…" : "Save report"}</button>
      </div>
    </div>
  );
}
