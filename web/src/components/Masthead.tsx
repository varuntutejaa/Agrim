// Top bar: wordmark, the views, the English/Hindi switch, and when the data was last updated.
import type { View } from "../types";
import { type Lang, t } from "../i18n";

const VIEW_KEYS: View[] = ["forecast", "simulator", "drainage", "ops", "data"];

type Props = {
  view: View;
  onView: (v: View) => void;
  updated?: string;
  lang: Lang;
  onLang: (l: Lang) => void;
};

function LangSwitch({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  return (
    <div role="group" aria-label="Language" className="flex border border-ink text-[12px]">
      {(["en", "hi"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => onLang(l)}
          aria-pressed={lang === l}
          lang={l}
          className={`px-2 py-0.5 ${lang === l ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}

export default function Masthead({ view, onView, updated, lang, onLang }: Props) {
  const s = t(lang);
  return (
    <header className="border-b border-ink bg-paper">
      <div className="flex items-center gap-4 px-5 pt-3 md:h-14 md:px-7 md:pt-0">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="font-display text-[26px] font-semibold leading-none tracking-[-0.02em]">Agrim</span>
          <span className="truncate border-l border-rule pl-3 text-[11.5px] text-ink-2 sm:text-[12.5px]">{s.subtitle}</span>
        </div>
        <nav aria-label="Views" className="ml-auto hidden h-full items-stretch gap-7 md:flex">
          {VIEW_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => onView(key)}
              aria-current={view === key ? "page" : undefined}
              className={`-mb-px border-b-2 text-[14px] transition-colors ${
                view === key ? "border-ink font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              {s.tabs[key]}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-6 md:ml-8">
          {updated && <span className="hidden font-mono text-[11.5px] text-ink-3 lg:inline">{s.updated} {updated}</span>}
          <LangSwitch lang={lang} onLang={onLang} />
        </div>
      </div>
      {/* Phone: views as a full-width row */}
      <nav aria-label="Views" className="mt-2 grid grid-cols-5 md:hidden">
        {VIEW_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onView(key)}
            aria-current={view === key ? "page" : undefined}
            className={`-mb-px truncate border-b-2 px-0.5 py-2 text-[13px] ${
              view === key ? "border-ink font-medium text-ink" : "border-transparent text-ink-3"
            }`}
          >
            {s.tabs[key]}
          </button>
        ))}
      </nav>
    </header>
  );
}
