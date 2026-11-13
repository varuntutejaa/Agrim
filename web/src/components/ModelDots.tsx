// "2 of 3 weather models show flooding", as three small squares plus words.
import { type Lang, t } from "../i18n";

export default function ModelDots({ models, lang = "en", withText = false, onInk = false }: {
  models?: { flooding: number; total: number } | null;
  lang?: Lang;
  withText?: boolean;
  onInk?: boolean;
}) {
  if (!models || !models.total) return null;
  const label = t(lang).models(models.flooding, models.total);
  const edge = onInk ? "border-paper" : "border-ink";
  const fill = onInk ? "bg-paper" : "bg-ink";
  return (
    <span className="inline-flex items-center gap-2" title={label} aria-label={label}>
      <span className="inline-flex gap-[3px]" aria-hidden>
        {Array.from({ length: models.total }, (_, i) => (
          <span key={i} className={`inline-block h-2 w-2 border-[1.5px] ${edge} ${i < models.flooding ? fill : "bg-transparent"}`} />
        ))}
      </span>
      {withText && <span className="text-[13px] text-ink-2">{label}</span>}
    </span>
  );
}
