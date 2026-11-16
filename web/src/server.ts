// Is the live API answering? The free server sleeps when nobody uses it and
// takes up to a minute to wake, so every page shows a banner meanwhile
// (ServerBanner in App.tsx). Every API call in api.ts goes through tracked().
import { useSyncExternalStore } from "react";

//   idle     nothing asked yet
//   waiting  first request sent, no answer yet (no banner for the first few seconds)
//   waking   still no answer after WAKING_AFTER_MS: the server is probably asleep
//   up       the server has answered
//   down     the request failed (no connection, or the host gave up)
export type ServerState = "idle" | "waiting" | "waking" | "up" | "down";

const WAKING_AFTER_MS = 2500;
let state: ServerState = "idle";
const listeners = new Set<() => void>();

function set(next: ServerState) {
  if (state === next) return;
  state = next;
  listeners.forEach((l) => l());
}

/** Wraps an API fetch so the banner knows whether the server is answering. */
export function tracked(request: Promise<Response>): Promise<Response> {
  if (state === "idle") {
    set("waiting");
    setTimeout(() => { if (state === "waiting") set("waking"); }, WAKING_AFTER_MS);
  }
  return request.then(
    (res) => {
      // 502 and 504 come from the host while the server isn't running; anything else is the server itself.
      set(res.status === 502 || res.status === 504 ? "down" : "up");
      return res;
    },
    (err) => {
      if (err?.name !== "AbortError" && state !== "up") set("down");
      throw err;
    },
  );
}

export function useServerState(): ServerState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
  );
}
