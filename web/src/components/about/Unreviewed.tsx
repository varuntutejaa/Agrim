// The early check on news reports nobody has reviewed yet. The Backtest and
// Data pages both show it from the same API field (/backtest unreviewed_preview),
// always labelled "Unreviewed", so the two pages can't disagree.
import type { UnreviewedPreview } from "../../types";

export function unreviewedSentence(p: UnreviewedPreview): string {
  const noExtreme = (p.miss_reasons["model saw extreme rain"] ?? 0) === 0;
  return `On ${p.n} news reports of past floods that a person hasn't checked yet, the rules flagged ${p.caught}.` +
    (p.missed && noExtreme
      ? " In every miss, the weather model saw only ordinary or moderately wet weather at that spot, far less than was reported on the ground."
      : "");
}

export default function Unreviewed({ p, note }: { p: UnreviewedPreview; note?: string }) {
  const noPin = p.skipped["no map pin yet"] ?? 0;
  return (
    <div className="rounded-card border border-accent-2 p-5">
      <span className="tag">Unreviewed: an early check, not a result</span>
      <p className="mt-3 text-[15px] leading-relaxed text-ink">{unreviewedSentence(p)}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {noPin ? `${noPin} more reports have no map pin yet and are left out. ` : ""}{note}
      </p>
    </div>
  );
}
