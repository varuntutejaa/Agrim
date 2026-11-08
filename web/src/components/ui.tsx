// Small shared pieces of the Agrim look: kickers, text tabs, sliders, the
// exercise band. Kept plain on purpose: hairlines, type and space do the work.
import type { ReactNode } from "react";

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`kicker ${className}`}>{children}</div>;
}

/** Text tabs with an ink underline on the active one. */
export function TextTabs<K extends string>({
  options, value, onChange, size = "sm", label,
}: {
  options: { key: K; label: ReactNode }[];
  value: K;
  onChange: (k: K) => void;
  size?: "sm" | "md";
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-5">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`whitespace-nowrap border-b-2 pb-1 transition-colors ${size === "md" ? "text-[15px]" : "text-[13px]"} ${
              active ? "border-ink font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Labelled slider with a large figure readout. */
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
      <div className="flex items-baseline justify-between">
        <span className="kicker">{label}</span>
        <span className="font-mono tabular text-[22px] leading-none text-ink">
          {value}
          <span className="ml-1 text-[13px] text-ink-3">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        className="agrim-range mt-1"
        style={{ ["--fill" as string]: fill }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {note && <div className="text-[12px] text-ink-3">{note}</div>}
    </label>
  );
}

export function ExerciseBand({ label, note, compact = false, className = "" }: {
  label: string; note?: string; compact?: boolean; className?: string;
}) {
  return (
    <div className={`exercise-band flex items-center gap-3 ${compact ? "px-3 py-1.5" : "px-4 py-2.5"} ${className}`}>
      <span className="shrink-0 whitespace-nowrap bg-risk-amber px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wider text-ink">
        {label}
      </span>
      {note && <span className="text-[12px] text-paper/80">{note}</span>}
    </div>
  );
}

export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-rule ${className}`} />;
}
