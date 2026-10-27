/**
 * Vertical bars, one per week, oldest first. Flex follows the page direction, so the oldest week sits on the
 * start side (right in Hebrew and Arabic, left in English). The latest week is the lime one.
 * The whole chart is one image for screen readers; `aria` carries every number.
 */
export function UtilizationBars({ weeks, aria }: { weeks: { label: string; pct: number }[]; aria: string }) {
  const last = weeks.length - 1;
  return (
    <div role="img" aria-label={aria}>
      <div aria-hidden className="paper-grid flex h-44 items-end gap-3 border-b-2 border-ink px-1 sm:h-52 sm:gap-5 lg:h-56">
        {weeks.map((w, i) => (
          <div key={w.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className={`num mb-1.5 text-[17px] font-bold leading-none sm:text-[20px] ${i === last ? "text-ink" : "text-muted"}`}>{w.pct}%</span>
            <div
              className={`w-full max-w-[64px] rounded-t-[3px] ${i === last ? "border border-b-0 border-ink bg-hazard" : "bg-line"}`}
              style={{ height: `${Math.max(1.5, Math.min(100, w.pct) * 0.8)}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="flex gap-3 px-1 pt-2 sm:gap-5">
        {weeks.map((w, i) => (
          <div key={w.label} className={`num min-w-0 flex-1 text-center text-[12px] ${i === last ? "font-bold text-ink" : "text-muted"}`}>{w.label}</div>
        ))}
      </div>
    </div>
  );
}
