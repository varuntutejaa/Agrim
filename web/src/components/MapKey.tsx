// Compact key in the corner of the map. Changes with the view.
import type { View } from "../types";
import { LEVEL_BG } from "../risk";
import { type Lang, t } from "../i18n";

const Sq = ({ c }: { c: string }) => <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
const Line = ({ c, dashed = false, w = 2 }: { c: string; dashed?: boolean; w?: number }) => (
  <span className={`inline-block w-5 ${c}`} style={{ borderTopWidth: w, borderTopStyle: dashed ? "dashed" : "solid" }} />
);

export default function MapKey({ view, lang = "en", critical = false, sensors = false }: {
  view: View; lang?: Lang; critical?: boolean; sensors?: boolean;
}) {
  const k = t(lang).key;
  const rows: [React.ReactNode, string][] =
    view === "drainage"
      ? [
          [<Line c="border-ink-2" />, "Flow between hotspots"],
          [<Line c="border-ink-2" dashed w={1.5} />, "Onward flow"],
          [<Line c="border-water" w={3} />, "Flow line (from ground height)"],
          [<Line c="border-drain" w={1.5} />, "Mapped drain"],
          ...(critical ? ([[<Sq c="bg-water" />, "Outfall (number = hotspots served)"]] as [React.ReactNode, string][]) : []),
          ...(sensors ? ([
            [<span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-water bg-paper-3" />, "Proposed rain gauge"],
            [<span className="inline-block h-2.5 w-2.5 rounded-full bg-drain" />, "Proposed drain sensor"],
            [<span className="inline-block h-2.5 w-2.5 rounded-full border border-ink bg-risk-amber" />, "Proposed underpass monitor"],
          ] as [React.ReactNode, string][]) : []),
        ]
      : [
          [<Sq c={LEVEL_BG.red} />, k.red],
          [<Sq c={LEVEL_BG.amber} />, k.amber],
          [<Sq c={LEVEL_BG.green} />, k.green],
          ...(view === "simulator" ? ([[<Line c="border-risk-red" dashed />, k.flow], [<Sq c="bg-water" />, "Outfall: tap to block"]] as [React.ReactNode, string][]) : []),
        ];
  return (
    // Hidden on phones: the panel's count signs carry the same colours.
    <div className="plate pointer-events-none absolute bottom-8 left-4 hidden px-4 py-3 md:block">
      <ul className="m-0 list-none space-y-1.5 p-0">
        {rows.map(([icon, label]) => (
          <li key={label} className="flex items-center gap-2.5 text-[13px] text-ink">
            <span className="flex w-5 justify-center">{icon}</span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
