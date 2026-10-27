import Link from "next/link";

export type WeekBar = {
  date: string; href: string; assigned: number; free: number; total: number;
  /** "12" + "פנויים", or the "full" word when nobody is free */
  count: string | null; word: string; weekday: string; dateLabel: string; aria: string;
};

// Free workers: signal-orange diagonal hatching, the "attention" colour of the design language.
const HATCH = { backgroundImage: "repeating-linear-gradient(135deg, #ff7a45 0 2px, #fff3ec 2px 7px)" };

/**
 * One stacked bar per work day: booked workers solid navy at the bottom, free workers hatched on top.
 * Every day has the same total, so the bars share one height and the hatched part shows the gap at a glance.
 * Each bar opens that day in the calendar; its aria-label reads the numbers.
 */
export function WeekBars({ days }: { days: WeekBar[] }) {
  return (
    <ul className="flex gap-1.5 sm:gap-3">
      {days.map((d) => (
        <li key={d.date} className="min-w-0 flex-1">
          <Link href={d.href} aria-label={d.aria} className="group flex flex-col items-center rounded-[3px] pb-1 pt-1 transition hover:bg-paper focus-visible:bg-paper">
            <span aria-hidden className="flex h-10 flex-col items-center justify-end leading-none">
              {d.count != null && <span className="num text-[17px] font-bold text-ink sm:text-[19px]">{d.count}</span>}
              <span className={`mt-1 text-[11px] sm:text-[12px] ${d.free ? "text-muted" : "font-bold text-ok"}`}>{d.word}</span>
            </span>
            <span aria-hidden className="mt-1.5 flex h-32 w-full max-w-[56px] flex-col overflow-hidden rounded-[3px] border border-ink sm:h-40">
              {d.free > 0 && <span className={`block ${d.assigned ? "border-b border-ink" : ""}`} style={{ ...HATCH, flexGrow: d.free, flexBasis: 0 }} />}
              {d.assigned > 0 && <span className="block bg-ink" style={{ flexGrow: d.assigned, flexBasis: 0 }} />}
            </span>
            <span aria-hidden className="mt-2 text-[12px] font-bold text-ink">{d.weekday}</span>
            <span aria-hidden className="num text-[12px] text-muted">{d.dateLabel}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function WeekLegend({ booked, free }: { booked: string; free: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
      <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-3 rounded-[2px] bg-ink" />{booked}</span>
      <span className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-3 rounded-[2px] border border-ink" style={HATCH} />{free}</span>
    </div>
  );
}
