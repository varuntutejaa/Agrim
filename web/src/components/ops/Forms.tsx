// Officer forms: override a hotspot's level, and report what happened after the rain.
import { useState } from "react";
import type { HotspotRisk, RiskLevel, RiskWindowKey } from "../../types";
import { LEVEL_COLOR, LEVEL_LONG } from "../../risk";
import { TextTabs } from "../ui";

const inputCls = "w-full border border-ink bg-paper px-2.5 py-1.5 text-[13.5px] outline-none focus:border-water focus:ring-1 focus:ring-water";
const buttonCls = "border border-ink bg-ink px-3.5 py-1.5 text-[13px] font-medium text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40";

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
    <div className="space-y-3">
      {w.override && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-l-2 border-ink pl-2.5 text-[12.5px]">
          <span>
            Overridden to <b style={{ color: LEVEL_COLOR[w.level] }}>{LEVEL_LONG[w.level]}</b> by {w.override.officer}:{" "}
            <span className="text-ink-2">"{w.override.reason}"</span>
          </span>
          <button disabled={disabled || busy} onClick={run(() => onRevoke(w.override!.id))} className="text-[12.5px] text-risk-red underline disabled:opacity-40">
            Cancel override
          </button>
        </div>
      )}
      <div>
        <div className="kicker mb-1.5">Set level (model says {LEVEL_LONG[modelLevel].toLowerCase()})</div>
        <div className="flex gap-2">
          {(["red", "amber", "green"] as RiskLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={`flex items-center gap-1.5 border px-2.5 py-1 text-[12.5px] ${level === l ? "border-ink bg-paper-3 font-medium" : "border-rule text-ink-2 hover:border-ink"}`}
            >
              <span className="inline-block h-2.5 w-2.5" style={{ background: LEVEL_COLOR[l] }} />
              {LEVEL_LONG[l]}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="kicker">Reason (what you know that the model doesn't)</span>
        <textarea className={`${inputCls} mt-1 h-16 resize-none`} maxLength={500} value={reason}
          placeholder="e.g. Drain desilted yesterday; pump already on site" onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
          Applies for
          <select className="border border-ink bg-paper px-1.5 py-1 font-mono text-[12px]" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[6, 12, 24, 48, 72].map((n) => <option key={n} value={n}>{n} h</option>)}
          </select>
        </label>
        <button className={buttonCls} disabled={disabled || busy || reason.trim().length < 10 || level === w.level}
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
          Date
          <input type="date" max={today} className="border border-ink bg-paper px-1.5 py-1 font-mono text-[12px]" value={eventDate}
            onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-ink-2">Flooded?</span>
          <TextTabs label="Flooded" options={[{ key: "yes" as const, label: "Yes" }, { key: "no" as const, label: "No" }]} value={flooded} onChange={setFlooded} />
        </div>
      </div>
      {flooded === "yes" && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-ink-2">Depth</span>
            <TextTabs label="Depth" value={depth} onChange={setDepth} options={[
              { key: "ankle", label: "Ankle" }, { key: "knee", label: "Knee" }, { key: "waist", label: "Waist" }, { key: "unknown", label: "Not sure" },
            ]} />
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
            Hours
            <input type="number" min={0} max={240} step={0.5} className="w-16 border border-ink bg-paper px-1.5 py-1 font-mono text-[12px]"
              value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        </div>
      )}
      <textarea className={`${inputCls} h-14 resize-none`} maxLength={1000} placeholder="Notes (optional): what crews saw, whether the pump helped"
        value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end">
        <button className={buttonCls} disabled={disabled || busy} onClick={save}>{busy ? "Saving…" : "Save report"}</button>
      </div>
    </div>
  );
}
