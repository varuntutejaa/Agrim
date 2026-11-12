// Pages live in the URL hash (#/forecast, #/about/backtest ...), so links can be shared.
import { useEffect, useState } from "react";
import type { AboutTab, View } from "./types";

const VIEWS: View[] = ["home", "forecast", "simulator", "drainage", "ops", "about"];
const ABOUT: AboutTab[] = ["about", "backtest", "overrides", "data", "sources"];
const ALIAS: Record<string, View> = { desk: "ops", "": "home" };

export type Route = { view: View; tab: AboutTab };

function parse(hash: string): Route {
  const [a = "", b = ""] = hash.replace(/^#\/?/, "").split("/");
  const view = (ALIAS[a] ?? (VIEWS.includes(a as View) ? a : "home")) as View;
  const tab = (ABOUT.includes(b as AboutTab) ? b : "about") as AboutTab;
  return { view, tab };
}

export function href(view: View, tab?: AboutTab) {
  const v = view === "ops" ? "desk" : view === "home" ? "" : view;
  return `#/${v}${view === "about" && tab && tab !== "about" ? `/${tab}` : ""}`;
}

export function useRoute(): [Route, (view: View, tab?: AboutTab) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (view: View, tab?: AboutTab) => {
    window.location.hash = href(view, tab);
    window.scrollTo(0, 0);
  };
  return [route, go];
}
