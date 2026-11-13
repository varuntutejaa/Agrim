// Small shared pieces of the Agrim look: labels, choice cells, sliders, the
// exercise band. Signage rules: square 2px borders, one face, words over colour.
import { type ReactNode, useEffect, useRef } from "react";

/** A label or caption: the body face, a step smaller, sentence case. */
export function Label({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "span" | "h3" | "p" }) {
  return <Tag className={`label ${className}`}>{children}</Tag>;
}

/** In a row that scrolls sideways, bring the chosen cell into view (sideways only, never the page). */
export function useActiveInView<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const row = ref.current;
    const active = row?.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="page"]');
    let box: HTMLElement | null = row;
    while (box && box.scrollWidth <= box.clientWidth) box = box.parentElement;
    if (!active || !box || box === document.body || box === document.documentElement) return;
    const a = active.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (a.left < b.left) box.scrollLeft -= b.left - a.left + 16;
    else if (a.right > b.right) box.scrollLeft += a.right - b.right + 16;
  }, [dep]);
  return ref;
}

/** A choice between a few: square cells sharing 2px borders; the chosen one fills ink. */
export function TextTabs<K extends string>({
  options, value, onChange, size = "sm", label, onInk = false,
}: {
  options: { key: K; label: ReactNode }[];
  value: K;
  onChange: (k: K) => void;
  size?: "sm" | "md";
  label: string;
  onInk?: boolean;
}) {
  const ref = useActiveInView<HTMLDivElement>(value);
  return (
    <div ref={ref} role="tablist" aria-label={label} className="cells">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`cell ${onInk ? "cell--on-ink" : ""} ${size === "md" ? "min-h-10 px-4 text-[15px]" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Labelled slider with its figure set large, like a sign. */
export function Slider({
  label, value, min, max, step = 1, unit, onChange, note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  note?: ReactNode;
}) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium text-ink">{label}</span>
        <span className="text-[28px] font-display font-medium leading-none tracking-[-0.02em] text-ink">
          {value}
          {"\u00a0"}<span className="text-[13px] font-medium tracking-normal text-muted">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        className="agrim-range mt-2"
        style={{ ["--fill" as string]: fill }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {note && <div className="mt-1 text-[13px] text-muted">{note}</div>}
    </label>
  );
}

/** "EXERCISE / अभ्यास" from the server, shown in sentence case on its amber plate. */
const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function ExerciseBand({ label, note, compact = false, className = "" }: {
  label: string; note?: string; compact?: boolean; className?: string;
}) {
  return (
    <div className={`exercise-band flex items-center gap-3 ${compact ? "px-3 py-2" : "px-4 py-3"} ${className}`}>
      <span className="tag shrink-0">
        {sentence(label)}
      </span>
      {note && <span className="text-[13px] text-paper-dim">{note}</span>}
    </div>
  );
}

export function Rule({ className = "", strong = false }: { className?: string; strong?: boolean }) {
  return <hr className={`m-0 border-0 ${strong ? "border-t border-rule" : "border-t border-rule"} ${className}`} />;
}
