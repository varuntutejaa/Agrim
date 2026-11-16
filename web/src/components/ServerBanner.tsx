// Shown on every page while the live server is waking up or can't be reached,
// with a note on what is shown meanwhile (the stored copy, and how old it is).
import { type Lang, t } from "../i18n";
import type { ServerState } from "../server";

export default function ServerBanner({ state, lang, note }: { state: ServerState; lang: Lang; note: string | null }) {
  if (state !== "waking" && state !== "down") return null;
  const s = t(lang);
  return (
    <div role="status" aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-accent-2 bg-paper-2 px-4 py-2 text-[14px] text-ink md:px-6">
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-2" aria-hidden />
      <span className="min-w-0 flex-1">{state === "down" ? s.down : s.waking}{note ? ` ${note}` : ""}</span>
      {state === "down" && (
        <button type="button" className="btn btn--sm" onClick={() => window.location.reload()}>{s.retry}</button>
      )}
    </div>
  );
}
