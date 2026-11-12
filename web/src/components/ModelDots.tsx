// "2 of 3 weather models show flooding", as three small squares plus words.
import { type Lang, t } from "../i18n";

export default function ModelDots({ models, lang = "en", withText = false }: {
  models?: { flooding: number; total: number } | null;
  lang?: Lang;
  withText?: boolean;
}) {
  if (!models || !models.total) return null;
  const label = t(lang).models(models.flooding, models.total);
  return (
    <span className="inline-flex items-center gap-1.5" title={label} aria-label={label}>
      <span className="inline-flex gap-[3px]" aria-hidden>
        {Array.from({ length: models.total }, (_, i) => (
          <span key={i} className={`inline-block h-[7px] w-[7px] border border-ink ${i < models.flooding ? "bg-ink" : "bg-transparent"}`} />
        ))}
      </span>
      {withText && <span className="text-[12px] text-ink-2">{label}</span>}
    </span>
  );
}
