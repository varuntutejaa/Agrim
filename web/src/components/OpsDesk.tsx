// MCG operations desk: who needs a pump, by when, what's done, and what
// officers changed. Works on the live forecast or, for drills and the jury
// demo, on the simulator's storm (clearly marked as an exercise).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError, deskCode, fetchChecklist, fetchExerciseOrders, fetchFeedback, fetchOrders, fetchOverrides, postCheck,
  postFeedback, postOverride, resetExercise, revokeOverride,
} from "../api";
import type {
  CheckItem, CheckTick, FeedbackRecord, HotspotRisk, Orders, OpsSource, OverrideRecord, RiskResult, RiskWindowKey,
  SimRequest, SimResult,
} from "../types";
import { plural } from "../risk";
import ActionTable from "./ops/ActionTable";
import { FeedbackLog, OrdersCard, OverrideLog } from "./ops/Sidebar";
import SopTimeline from "./ops/SopTimeline";
import { ExerciseBand, Kicker, TextTabs } from "./ui";

type Props = {
  source: OpsSource;
  onSource: (s: OpsSource) => void;
  risk: RiskResult | null;
  riskWindow: RiskWindowKey;
  onRiskWindow: (w: RiskWindowKey) => void;
  simResult: SimResult | null;
  simRequest: SimRequest;
  onChanged: () => void; // re-fetch the forecast / re-run the exercise after an override
  onOpenSimulator: () => void;
};

const OFFICER_KEY = "agrim.officer";
const zoneOf = (h: HotspotRisk) => h.zone?.trim() || "Unassigned";
const fmtDeadline = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", hour: "numeric", hour12: true }).replace(",", "");

export default function OpsDesk(p: Props) {
  const exercise = p.source === "exercise";
  const result = exercise ? p.simResult : p.risk;
  const windowKey: RiskWindowKey = exercise ? "next_24h" : p.riskWindow;
  const runKey = exercise ? "exercise" : p.risk?.meta.run_id ?? "";

  const [zone, setZone] = useState("all");
  const [officer, setOfficer] = useState(() => {
    try { return localStorage.getItem(OFFICER_KEY) ?? ""; } catch { return ""; }
  });
  const [orders, setOrders] = useState<Orders | null>(null);
  const [ticks, setTicks] = useState<CheckTick[]>([]);
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [dbAvailable, setDbAvailable] = useState(true);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [needCode, setNeedCode] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  const saveOfficer = (v: string) => {
    setOfficer(v);
    try { localStorage.setItem(OFFICER_KEY, v); } catch { /* private mode */ }
  };

  // Orders for the chosen zone (live forecast or exercise storm).
  useEffect(() => {
    if (!result) return;
    let stale = false;
    setOrders(null);
    const load = exercise ? fetchExerciseOrders(p.simRequest, zone) : fetchOrders(zone, windowKey);
    load.then((o) => !stale && setOrders(o)).catch((e) => !stale && setMessage({ kind: "error", text: String(e.message ?? e) }));
    return () => { stale = true; };
  }, [result, exercise, zone, windowKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = useCallback(() => {
    fetchOverrides().then((r) => { setDbAvailable(r.available); setOverrides(r.overrides); }).catch(() => {});
    fetchFeedback().then((r) => setFeedback(r.feedback)).catch(() => {});
  }, []);
  useEffect(loadLogs, [loadLogs]);

  useEffect(() => {
    if (!runKey) return;
    fetchChecklist(runKey).then((r) => setTicks(r.ticks)).catch(() => {});
  }, [runKey]);

  const canAct = dbAvailable && officer.trim().length >= 2;

  /** Run an officer action; show the server's message if it is refused. */
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMessage(null);
    try {
      await fn();
      setMessage({ kind: "ok", text: ok });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setNeedCode(true);
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  };

  const scoredInZone = useMemo(
    () => (result?.hotspots ?? []).filter((h) => zone === "all" || zoneOf(h) === zone),
    [result, zone],
  );
  const names = useMemo(() => Object.fromEntries((result?.hotspots ?? []).map((h) => [h.id, h.name])), [result]);
  const zones = orders?.zones ?? ["Unassigned"];
  const zoneKey = zone === "all" ? "all" : zone;
  const listIssued = ticks.some((t) => t.zone === zoneKey && t.item === "list_issued" && t.done);

  const onTick = (h: Extract<HotspotRisk, { scored: true }>, item: CheckItem, value: boolean) => {
    const z = zoneOf(h);
    const optimistic: CheckTick = { run_key: runKey, zone: z, hotspot_id: h.id, item, done: value, officer, updated_at: new Date().toISOString() };
    setTicks((t) => [...t.filter((x) => !(x.zone === z && x.hotspot_id === h.id && x.item === item)), optimistic]);
    act(() => postCheck({ run_key: runKey, zone: z, hotspot_id: h.id, item, done: value, officer }), "Saved.")
      .catch(() => fetchChecklist(runKey).then((r) => setTicks(r.ticks)));
  };

  const markIssued = (value: boolean) => {
    act(() => postCheck({ run_key: runKey, zone: zoneKey, hotspot_id: "", item: "list_issued", done: value, officer }),
      value ? "Orders marked as issued." : "Cleared.")
      .then(() => fetchChecklist(runKey).then((r) => setTicks(r.ticks)))
      .catch(() => {});
  };

  const counts = orders?.counts;
  const firstDeadline = orders?.items.map((i) => i.t12).sort()[0];
  const headline = !counts
    ? "Loading…"
    : counts.red + counts.amber === 0
      ? "No pumps to move. Every hotspot here is low risk."
      : `${plural(counts.red + counts.amber, "hotspot")} to prepare${firstDeadline ? new Date(firstDeadline) <= new Date() ? ", starting now." : ` by ${fmtDeadline(firstDeadline)}.` : "."}`;

  return (
    <div className="min-h-full">
      {exercise && <ExerciseBand label="EXERCISE / अभ्यास" note="Drill on the simulator's storm. Logged separately from live operations." />}
      <div className="mx-auto max-w-[1320px] px-5 pb-16 pt-6 md:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-[680px]">
            <Kicker>MCG operations desk · {exercise ? "Exercise" : windowKey === "next_24h" ? "Next 24 hours" : "Day 2"}</Kicker>
            <h1 className="mt-1 font-display text-[30px] font-medium leading-[1.12] tracking-[-0.01em] md:text-[36px]">{headline}</h1>
            {counts && counts.red + counts.amber > 0 && (
              <p className="mt-2 text-[14px] text-ink-2">
                {counts.red > 0 && <>{plural(counts.red, "Red spot")} need a pump on site; </>}
                {counts.amber > 0 && <>{plural(counts.amber, "Amber spot")} need{counts.amber === 1 ? "s" : ""} gullies cleared and a pump on standby.</>}
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <TextTabs label="Source" size="md" value={p.source} onChange={p.onSource}
              options={[{ key: "live" as const, label: "Live forecast" }, { key: "exercise" as const, label: "Exercise" }]} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {!exercise && (
                <TextTabs label="Window" value={p.riskWindow} onChange={p.onRiskWindow}
                  options={[{ key: "next_24h" as const, label: "Next 24 h" }, { key: "day_2" as const, label: "Day 2" }]} />
              )}
              <TextTabs label="Zone" value={zone} onChange={setZone}
                options={[{ key: "all", label: "All zones" }, ...zones.map((z) => ({ key: z, label: z === "Unassigned" ? "No zone" : `Zone ${z}` }))]} />
            </div>
          </div>
        </div>

        {/* Officer + status line */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-3 text-[13px]">
          <label className="flex items-center gap-2">
            <span className="kicker">Officer</span>
            <input value={officer} onChange={(e) => saveOfficer(e.target.value)} placeholder="Your name" maxLength={80}
              className="w-44 border-b border-ink bg-transparent px-1 py-0.5 text-[13.5px] outline-none focus:border-water" />
          </label>
          {needCode && (
            <label className="flex items-center gap-2">
              <span className="kicker">Desk code</span>
              <input type="password" value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
                className="w-28 border-b border-ink bg-transparent px-1 py-0.5 font-mono text-[13px] outline-none" />
              <button className="text-[12.5px] underline" onClick={() => { deskCode.set(codeInput); setNeedCode(false); setMessage(null); }}>Save</button>
            </label>
          )}
          {!dbAvailable && (
            <span className="text-risk-amber">Officer actions are off until the database is connected (DATABASE_URL).</span>
          )}
          {dbAvailable && officer.trim().length < 2 && <span className="text-ink-3">Enter your name to tick, override or report.</span>}
          {message && (
            <span className={message.kind === "error" ? "text-risk-red" : "text-risk-green"} role="status">{message.text}</span>
          )}
          <div className="ml-auto flex items-center gap-5">
            {exercise && (
              <>
                <button className="text-[12.5px] text-ink-2 underline-offset-4 hover:underline" onClick={p.onOpenSimulator}>Change the storm</button>
                <button className="text-[12.5px] text-ink-2 underline-offset-4 hover:underline disabled:opacity-40" disabled={!dbAvailable}
                  onClick={() => act(resetExercise, "Exercise reset.").then(() => { setTicks([]); loadLogs(); p.onChanged(); }).catch(() => {})}>
                  Reset drill
                </button>
              </>
            )}
          </div>
        </div>

        {/* SOP timeline */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <Kicker>Pre-event checklist (SOP)</Kicker>
            {orders && orders.items.length > 0 && (
              <button
                disabled={!canAct}
                onClick={() => markIssued(!listIssued)}
                className="text-[12.5px] text-ink-2 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                {listIssued ? "Undo: orders issued" : "Mark orders as issued"}
              </button>
            )}
          </div>
          <SopTimeline orders={orders} ticks={ticks} feedback={feedback} zoneKey={zoneKey} />
        </div>

        {/* Table + sidebar */}
        <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0">
            <Kicker className="mb-2">Hotspots needing action</Kicker>
            {result ? (
              <ActionTable
                hotspots={scoredInZone}
                windowKey={windowKey}
                items={orders?.items ?? []}
                ticks={ticks}
                canAct={canAct}
                onTick={onTick}
                onOverride={(h, level, reason, hours) =>
                  act(() => postOverride({
                    officer, hotspot_id: h.id, new_level: level, reason, valid_hours: hours, is_exercise: exercise,
                    model_level: h.windows[windowKey].model_level ?? h.windows[windowKey].level,
                    run_id: exercise ? "exercise" : p.risk?.meta.run_id ?? null,
                  }), "Override saved.").then(() => { loadLogs(); p.onChanged(); })}
                onRevoke={(id) => act(() => revokeOverride(id, officer), "Override cancelled.").then(() => { loadLogs(); p.onChanged(); })}
                onFeedback={(h, f) => act(() => postFeedback({ officer, hotspot_id: h.id, ...f }), "Report saved. Thank you.").then(loadLogs)}
              />
            ) : (
              <div className="h-72 animate-pulse bg-paper-2" />
            )}
            {exercise && !p.simResult && (
              <p className="mt-3 text-[13px] text-ink-3">Running the exercise storm…</p>
            )}
          </section>
          <aside className="space-y-9">
            <OrdersCard orders={orders} />
            <OverrideLog items={overrides} names={names} />
            <FeedbackLog items={feedback} names={names} />
          </aside>
        </div>
      </div>
    </div>
  );
}
