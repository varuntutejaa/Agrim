// Compact key in the corner of the map. Changes with the view.
import type { View } from "../types";
import { LEVEL_COLOR } from "../risk";
import { type Lang, t } from "../i18n";

const Dot = ({ c }: { c: string }) => <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />;
const Line = ({ c, dashed = false, w = 2 }: { c: string; dashed?: boolean; w?: number }) => (
  <span className="inline-block w-5" style={{ borderTop: `${w}px ${dashed ? "dashed" : "solid"} ${c}` }} />
);

export default function MapKey({ view, lang = "en" }: { view: View; lang?: Lang }) {
  const k = t(lang).key;
  const rows: [React.ReactNode, string][] =
    view === "drainage"
      ? [
          [<Line c="#4b5058" />, "Flow between hotspots"],
          [<Line c="#4b5058" dashed w={1.5} />, "Onward flow"],
          [<Line c="#24527a" w={3} />, "Flow line (from ground height)"],
          [<Line c="#2f6f73" w={1.5} />, "Mapped drain"],
        ]
      : [
          [<Dot c={LEVEL_COLOR.red} />, k.red],
          [<Dot c={LEVEL_COLOR.amber} />, k.amber],
          [<Dot c={LEVEL_COLOR.green} />, k.green],
          ...(view === "simulator" ? ([[<Line c={LEVEL_COLOR.red} dashed />, k.flow]] as [React.ReactNode, string][]) : []),
        ];
  return (
    // Hidden on phones: the panel's count strip carries the same colours.
    <div className="pointer-events-none absolute bottom-8 left-4 hidden border border-ink bg-paper/95 px-3 py-2 md:block">
      <ul className="space-y-1">
        {rows.map(([icon, label]) => (
          <li key={label} className="flex items-center gap-2 text-[11.5px] text-ink-2">
            <span className="flex w-5 justify-center">{icon}</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
