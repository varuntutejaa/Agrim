// Every officer override, public: where, when, what changed and why (no officer names).
import { useEffect, useState } from "react";
import { fetchPublicOverrides } from "../../api";
import type { PublicOverride } from "../../types";
import { LEVEL_COLOR, LEVEL_LABEL } from "../../risk";
import { Kicker } from "../ui";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function PublicOverridesPage() {
  const [rows, setRows] = useState<PublicOverride[] | null>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    fetchPublicOverrides().then((r) => { setRows(r.overrides); setAvailable(r.available); }).catch(() => setRows([]));
  }, []);
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-6 md:px-8">
      <Kicker>Public override log</Kicker>
      <h1 className="mt-1 max-w-[820px] font-display text-[30px] font-medium leading-[1.12] md:text-[36px]">
        When an MCG officer changes Agrim's call for a hotspot, it's shown here, with the reason.
      </h1>
      <p className="mt-3 max-w-[760px] text-[14px] text-ink-2">
        Residents and RWAs can see every change to the public map: the place, the date, what the model said, what it was
        changed to, and why. Officer names are kept internal. Drills (exercises) aren't listed.
      </p>
      {!available && <p className="mt-4 text-[13px] text-risk-amber">The log needs the database, which isn't connected here.</p>}
      {rows === null ? (
        <div className="mt-6 h-32 animate-pulse bg-paper-2" />
      ) : rows.length === 0 ? (
        <p className="mt-6 border-y border-rule py-4 text-[14px] text-ink-2">No overrides so far.</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule border-y border-ink">
          {rows.map((o) => (
            <li key={o.id} className={`grid gap-1 py-3 text-[13.5px] md:grid-cols-[170px_1fr_220px] ${o.revoked_at ? "opacity-60" : ""}`}>
              <span className="font-mono text-[12px] text-ink-3">{when(o.created_at)}</span>
              <span>
                <b>{o.hotspot_name}</b>
                <span className="block text-ink-2">"{o.reason}"</span>
              </span>
              <span className="text-[13px]">
                <span style={{ color: o.model_level ? LEVEL_COLOR[o.model_level] : undefined }}>{o.model_level ? LEVEL_LABEL[o.model_level] : "?"}</span>
                {" → "}
                <b style={{ color: LEVEL_COLOR[o.new_level] }}>{LEVEL_LABEL[o.new_level]}</b>
                <span className="block text-[12px] text-ink-3">{o.revoked_at ? "cancelled" : `until ${when(o.valid_until)}`}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
