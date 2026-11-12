// The "About" area: who built it, how it did on past floods, public overrides,
// data and assumptions, and every source.
import type { AboutTab } from "../../types";
import DataPage from "../DataPage";
import { TextTabs } from "../ui";
import AboutPage from "./AboutPage";
import BacktestPage from "./BacktestPage";
import PublicOverridesPage from "./PublicOverridesPage";
import SourcesPage from "./SourcesPage";

// Short names on phones so all five tabs fit on one line.
const both = (short: string, long: string) => (
  <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{long}</span></>
);
const TABS: { key: AboutTab; label: React.ReactNode }[] = [
  { key: "about", label: "About" },
  { key: "backtest", label: "Backtest" },
  { key: "overrides", label: both("Overrides", "Public overrides") },
  { key: "data", label: both("Data", "Data & assumptions") },
  { key: "sources", label: both("Sources", "Sources & credits") },
];

export default function AboutSection({ tab, onTab }: { tab: AboutTab; onTab: (t: AboutTab) => void }) {
  return (
    <div>
      <div className="sticky top-0 z-10 overflow-x-auto border-b border-rule bg-paper px-5 pt-3 md:px-8">
        <div className="mx-auto max-w-[1100px]"><TextTabs label="About sections" options={TABS} value={tab} onChange={onTab} /></div>
      </div>
      {tab === "about" && <AboutPage />}
      {tab === "backtest" && <BacktestPage />}
      {tab === "overrides" && <PublicOverridesPage />}
      {tab === "data" && <DataPage />}
      {tab === "sources" && <SourcesPage />}
    </div>
  );
}
