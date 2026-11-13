// The "About" area: who built it, how it did on past floods, public overrides,
// data and assumptions, and every source.
import type { AboutTab } from "../../types";
import DataPage from "../DataPage";
import { TextTabs } from "../ui";
import AboutPage from "./AboutPage";
import BacktestPage from "./BacktestPage";
import PublicOverridesPage from "./PublicOverridesPage";
import SourcesPage from "./SourcesPage";

// Short names on phones so the row stays short; it scrolls sideways if it must.
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
      <div className="sticky top-0 z-10 border-b-2 border-ink bg-paper">
        <div className="mx-auto max-w-[1360px] overflow-x-auto px-4 py-3 md:px-10">
          <TextTabs label="About sections" options={TABS} value={tab} onChange={onTab} />
        </div>
      </div>
      {tab === "about" && <AboutPage />}
      {tab === "backtest" && <BacktestPage />}
      {tab === "overrides" && <PublicOverridesPage />}
      {tab === "data" && <DataPage />}
      {tab === "sources" && <SourcesPage />}
    </div>
  );
}
