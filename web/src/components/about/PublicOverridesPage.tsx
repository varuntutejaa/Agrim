// Every officer override, public: where, when, what changed and why (no officer names).
import { useEffect, useState } from "react";
import { fetchPublicOverrides } from "../../api";
import type { PublicOverride } from "../../types";
import { LEVEL_LABEL } from "../../risk";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function PublicOverridesPage() {
  const [rows, setRows] = useState<PublicOverride[] | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    fetchPublicOverrides().then((r) => { setRows(r.overrides); setAvailable(r.available); }).catch(() => setRows([]));
  }, []);
  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-20 pt-10 md:px-10 md:pt-14">
      <h1 className="h-page">When an MCG officer changes Agrim's call for a hotspot, it's shown here, with the reason.</h1>
      <p className="mt-5 max-w-[65ch] text-[16px] leading-[1.7] text-ink-2">
        Residents and RWAs can see every change to the public map: the place, the date, what the model said, what it was
        changed to, and why. Officer names are kept internal. Drills (exercises) aren't listed.
      </p>
      {!available && <p className="mt-5 font-extrabold text-ink">The log needs the database, which isn't connected here.</p>}
      {rows === null ? (
        <div className="mt-10 h-32 bg-paper-2" aria-label="Loading" />
      ) : rows.length === 0 ? (
        <p className="mt-10 border-y-2 border-ink py-5 text-[16px] text-ink-2">No overrides so far.</p>
      ) : (
        <>
          <div className="mt-10 hidden border-b-2 border-ink pb-2 md:grid md:grid-cols-[190px_minmax(0,1fr)_260px] md:gap-x-6" role="presentation">
            <span className="label">When</span><span className="label">Hotspot and reason</span><span className="label">Change</span>
          </div>
          <ul className="m-0 list-none p-0">
            {rows.map((o) => (
              <li key={o.id} className={`grid gap-2 border-b border-rule py-4 text-[15px] md:grid-cols-[190px_minmax(0,1fr)_260px] md:gap-x-6 ${o.revoked_at ? "opacity-60" : ""}`}>
                <span className="text-[14px] text-muted">{when(o.created_at)}</span>
                <span>
                  <b>{o.hotspot_name}</b>
                  <span className="mt-1 block text-ink-2">“{o.reason}”</span>
                </span>
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    {o.model_level ? <span className={`status status--${o.model_level}`}>{LEVEL_LABEL[o.model_level]}</span> : <span className="text-muted">?</span>}
                    <span aria-label="changed to">→</span>
                    <span className={`status status--${o.new_level}`}>{LEVEL_LABEL[o.new_level]}</span>
                  </span>
                  <span className="mt-1 block text-[13px] text-muted">{o.revoked_at ? "Cancelled" : `Until ${when(o.valid_until)}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
