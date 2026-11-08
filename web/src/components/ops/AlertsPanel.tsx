// Citizen alerts for Red hotspots: review the English and Hindi text (and the
// voice-call script), pick which to send, approve. The server re-creates the
// text itself and sends only through its configured channel (console by default).
import { useEffect, useState } from "react";
import { fetchAlertDrafts, sendAlerts } from "../../api";
import type { AlertDraft, OpsSource, RiskWindowKey, SimRequest } from "../../types";
import { Kicker } from "../ui";

type Props = {
  source: OpsSource;
  windowKey: RiskWindowKey;
  simRequest: SimRequest;
  refreshKey: unknown;             // changes when the underlying forecast/simulation changes
  canAct: boolean;
  officer: string;
  onSent: (summary: string) => void;
  onError: (message: string) => void;
};

const CHANNEL_NOTE: Record<string, string> = {
  console: "Channel: console. Messages are written to the server log; nothing leaves the server.",
  twilio: "Channel: Twilio sandbox. Messages go only to the test numbers set on the server.",
};

export default function AlertsPanel(p: Props) {
  const [drafts, setDrafts] = useState<AlertDraft[] | null>(null);
  const [channel, setChannel] = useState("console");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [showIvr, setShowIvr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const req = { source: p.source, window: p.windowKey, sim: p.source === "exercise" ? p.simRequest : undefined };

  useEffect(() => {
    let stale = false;
    setDrafts(null);
    fetchAlertDrafts(req)
      .then((r) => {
        if (stale) return;
        setDrafts(r.alerts);
        setChannel(r.channel);
        setChosen(new Set(r.alerts.map((a) => a.hotspot_id)));
      })
      .catch((e) => !stale && p.onError(String(e.message ?? e)));
    return () => { stale = true; };
  }, [p.source, p.windowKey, p.refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const approve = async () => {
    setBusy(true);
    try {
      const r = await sendAlerts({ ...req, officer: p.officer, hotspot_ids: [...chosen] });
      const statuses = [...new Set(r.results.map((x) => x.status))].join(", ");
      p.onSent(`${r.sent} alert${r.sent === 1 ? "" : "s"} approved and ${statuses}.`);
    } catch (e) {
      p.onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Kicker>Citizen alerts (Red spots)</Kicker>
        <span className="text-[11.5px] text-ink-3">{CHANNEL_NOTE[channel] ?? `Channel: ${channel}`}</span>
      </div>
      {drafts === null ? (
        <div className="mt-2 h-24 animate-pulse bg-paper-2" />
      ) : drafts.length === 0 ? (
        <p className="mt-2 border-y border-rule py-3 text-[13.5px] text-ink-2">No Red hotspots, so no citizen alerts to send.</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {drafts.map((a) => (
              <li key={a.hotspot_id} className="py-2.5">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" className="mt-1 accent-[#17191e]" checked={chosen.has(a.hotspot_id)}
                    onChange={() => toggle(a.hotspot_id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium">{a.name}</span>
                    <span className="mt-0.5 block font-mono text-[11.5px] leading-snug text-ink-2">{a.sms_hi}</span>
                    <span className="mt-0.5 block font-mono text-[11.5px] leading-snug text-ink-2">{a.sms_en}</span>
                  </span>
                </label>
                <button className="ml-6 mt-1 text-[11.5px] text-ink-3 underline-offset-4 hover:underline"
                  onClick={() => setShowIvr((s) => (s === a.hotspot_id ? null : a.hotspot_id))}>
                  {showIvr === a.hotspot_id ? "Hide" : "Show"} voice-call script (mock IVR)
                </button>
                {showIvr === a.hotspot_id && (
                  <pre className="ml-6 mt-1 overflow-x-auto whitespace-pre-wrap bg-paper-2 p-2 font-mono text-[11px] text-ink-2">
                    {a.ivr.replace(/></g, ">\n<")}
                  </pre>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] text-ink-3">{chosen.size} of {drafts.length} selected · each sent in Hindi, then English</span>
            <button
              disabled={!p.canAct || busy || chosen.size === 0}
              onClick={approve}
              className="border border-ink bg-ink px-3.5 py-1.5 text-[13px] font-medium text-paper hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Sending…" : `Approve and send ${chosen.size}`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
