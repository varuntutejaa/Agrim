// Top bar: an ink slab like a station sign. The wordmark, the five destinations
// as cells, when the data was last updated, and the English/Hindi switch.
import type { View } from "../types";
import { type Lang, t } from "../i18n";
import { useActiveInView } from "./ui";

const VIEW_KEYS: View[] = ["forecast", "simulator", "drainage", "ops", "about"];

type Props = {
  view: View;
  onView: (v: View) => void;
  updated?: string;
  lang: Lang;
  onLang: (l: Lang) => void;
  stale?: boolean;         // forecast older than 12 h
};

function LangSwitch({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  return (
    <div role="group" aria-label="Language" className="cells">
      {(["en", "hi"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onLang(l)}
          aria-pressed={lang === l}
          lang={l}
          className="cell cell--on-ink min-h-8 px-2.5"
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}

export default function Masthead({ view, onView, updated, lang, onLang, stale = false }: Props) {
  const s = t(lang);
  const phoneNav = useActiveInView<HTMLElement>(view);
  return (
    <header className="bg-ink text-paper">
      <div className="flex h-14 items-center gap-5 px-4 md:px-6">
        <button
          type="button"
          onClick={() => onView("home")}
          aria-label="Agrim home"
          className="flex min-w-0 items-baseline gap-3 text-left"
        >
          <span className="text-[22px] font-extrabold leading-none tracking-[-0.04em]">Agrim</span>
          <span className="hidden truncate text-[13px] text-paper-dim lg:inline">{s.subtitle}</span>
        </button>
        <nav aria-label="Views" className="cells ml-auto hidden md:flex">
          {VIEW_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onView(key)}
              aria-current={view === key ? "page" : undefined}
              className="cell cell--on-ink"
            >
              {s.tabs[key]}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 md:ml-0">
          {updated && (
            <span className={`hidden text-[13px] xl:inline ${stale ? "font-extrabold text-accent-2" : "text-paper-dim"}`}>
              {s.updated} {updated}{stale ? `, ${lang === "hi" ? "पुराना" : "old"}` : ""}
            </span>
          )}
          <LangSwitch lang={lang} onLang={onLang} />
        </div>
      </div>
      {/* Phone and tablet: the destinations as a row of cells that scrolls sideways. */}
      <nav ref={phoneNav} aria-label="Views" className="cells overflow-x-auto px-4 pb-3 md:hidden">
        {VIEW_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onView(key)}
            aria-current={view === key ? "page" : undefined}
            className="cell cell--on-ink flex-1"
          >
            {s.tabs[key]}
          </button>
        ))}
      </nav>
    </header>
  );
}
