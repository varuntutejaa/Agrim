// Citizen alerts for Red hotspots: review the English and Hindi text (and the
// voice-call script), pick which to send, approve. The server re-creates the
// text itself and sends only through its configured channel (console by default).
import { useEffect, useState } from "react";
import { fetchAlertDrafts, sendAlerts } from "../../api";
import type { AlertDraft, OpsSource, RiskWindowKey, SimRequest } from "../../types";

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
      <h2 className="h-sub">Citizen alerts (Red spots)</h2>
      <p className="mt-1.5 text-[13px] text-muted">{CHANNEL_NOTE[channel] ?? `Channel: ${channel}`}</p>
      {drafts === null ? (
        <div className="mt-3 h-24 bg-paper-2" aria-label="Loading" />
      ) : drafts.length === 0 ? (
        <p className="mt-3 border-y-2 border-ink py-3 text-[15px] text-ink-2">No Red hotspots, so no citizen alerts to send.</p>
      ) : (
        <>
          <ul className="m-0 mt-3 list-none border-y-2 border-ink p-0">
            {drafts.map((a) => (
              <li key={a.hotspot_id} className="border-b border-rule py-3 last:border-b-0">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" className="check mt-1 shrink-0" checked={chosen.has(a.hotspot_id)}
                    onChange={() => toggle(a.hotspot_id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold">{a.name}</span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-2" lang="hi">{a.sms_hi}</span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-ink-2">{a.sms_en}</span>
                  </span>
                </label>
                <button type="button" className="link ml-7 mt-2 text-[13px]" aria-expanded={showIvr === a.hotspot_id}
                  onClick={() => setShowIvr((s) => (s === a.hotspot_id ? null : a.hotspot_id))}>
                  {showIvr === a.hotspot_id ? "Hide" : "Show"} voice-call script (mock IVR)
                </button>
                {showIvr === a.hotspot_id && (
                  <pre className="ml-7 mt-2 overflow-x-auto whitespace-pre-wrap border-2 border-ink bg-paper-3 p-3 text-[13px] text-ink-2">
                    {a.ivr.replace(/></g, ">\n<")}
                  </pre>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-muted">{chosen.size} of {drafts.length} selected. Each is sent in Hindi, then English.</span>
            <button type="button" disabled={!p.canAct || busy || chosen.size === 0} onClick={approve} className="btn btn--primary">
              {busy ? "Sending…" : `Approve and send ${chosen.size}`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
