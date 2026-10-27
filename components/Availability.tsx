"use client";
import { useI18n } from "@/lib/i18n/client";
import type { WorkerAvailability } from "@/lib/calendar";

// A worker's free work days in the near future (from workerAvailability() in lib/calendar.ts).
// compact: "7 free days · 70%" with a thin strip, one cell per work day.
// full: a titled strip with the weekday and date under each cell.
// A client component, so it can sit in client lists (search results) as well as server pages.

export function Availability({ a, variant = "compact", className = "" }: { a: WorkerAvailability | undefined; variant?: "compact" | "full"; className?: string }) {
  const { t, fmt, intl } = useI18n();
  if (!a || !a.total) return null;
  const aria = t("calendar.availability.aria", { free: a.free, total: a.total, pct: a.pct });
  const tone = a.pct >= 50 ? "text-ok" : a.pct > 0 ? "text-warn" : "text-muted";
  const label = <span className={`text-[13px] font-semibold ${tone}`}>{t("calendar.availability.label", { n: a.free, pct: a.pct })}</span>;
  const cell = (busy: boolean) => (busy ? "bg-ink" : "bg-hazard-soft outline outline-1 -outline-offset-1 outline-ok/30");

  if (variant === "compact") {
    return (
      <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`} title={aria}>
        {label}
        <span className="inline-flex gap-px" role="img" aria-label={aria}>
          {a.days.map((d) => <span key={d.date} className={`h-2.5 w-[7px] rounded-[1px] ${cell(d.busy)}`} />)}
        </span>
      </span>
    );
  }

  const narrow = new Intl.DateTimeFormat(intl, { weekday: "narrow", timeZone: "UTC" });
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow">{t("calendar.availability.title")}</span>
        {label}
      </div>
      <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${a.days.length}, minmax(0, 1fr))` }} aria-label={aria}>
        {a.days.map((d) => (
          <li key={d.date} className="min-w-0 text-center" title={`${fmt.prettyDate(d.date)} · ${t(d.busy ? "calendar.availability.busy" : "calendar.availability.free")}`}>
            <div className={`h-5 rounded-[2px] ${cell(d.busy)}`} />
            <div className="mt-1 text-[11px] font-bold leading-none text-ink">{narrow.format(new Date(d.date + "T12:00:00Z"))}</div>
            <div className="num mt-0.5 text-[10px] leading-none text-muted">{fmt.date(d.date)}</div>
          </li>
        ))}
      </ol>
      <div className="flex gap-4 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-[1px] ${cell(false)}`} />{t("calendar.availability.free")}</span>
        <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-[1px] ${cell(true)}`} />{t("calendar.availability.busy")}</span>
      </div>
    </div>
  );
}
