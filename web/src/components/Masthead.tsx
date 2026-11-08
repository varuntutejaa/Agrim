// Top bar: wordmark, the three views, and when the data was last updated.
import type { View } from "../types";

const VIEWS: { key: View; label: string }[] = [
  { key: "forecast", label: "Forecast" },
  { key: "simulator", label: "Simulator" },
  { key: "drainage", label: "Drainage" },
];

export default function Masthead({ view, onView, updated }: { view: View; onView: (v: View) => void; updated?: string }) {
  return (
    <header className="border-b border-ink bg-paper">
      <div className="flex items-center gap-4 px-5 pt-3 md:h-14 md:px-7 md:pt-0">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em]">Agrim</span>
          <span className="border-l border-rule pl-3 text-[11.5px] text-ink-2 sm:text-[12.5px]">
            Gurugram waterlogging forecast
          </span>
        </div>
        <nav aria-label="Views" className="ml-auto hidden h-full items-stretch gap-7 md:flex">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => onView(v.key)}
              aria-current={view === v.key ? "page" : undefined}
              className={`-mb-px border-b-2 text-[14px] transition-colors ${
                view === v.key ? "border-ink font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>
        {updated && (
          <span className="ml-auto hidden font-mono text-[11.5px] text-ink-3 md:ml-8 md:inline">Updated {updated}</span>
        )}
      </div>
      {/* Phone: views as a full-width row */}
      <nav aria-label="Views" className="mt-2 grid grid-cols-3 md:hidden">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => onView(v.key)}
            aria-current={view === v.key ? "page" : undefined}
            className={`-mb-px border-b-2 py-2 text-[14px] ${
              view === v.key ? "border-ink font-medium text-ink" : "border-transparent text-ink-3"
            }`}
          >
            {v.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
