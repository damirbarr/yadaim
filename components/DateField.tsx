"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Date input that always shows the Israeli day.month.year format in the app's language (יום ד׳ · 28.10.2026),
 * whatever the browser's language.
 * The native picker sits invisibly on top, so tapping still opens the phone's calendar; the form submits YYYY-MM-DD.
 */
export function DateField({ name, defaultValue = "", min, required, className = "", withDay = false }: { name: string; defaultValue?: string; min?: string; required?: boolean; className?: string; withDay?: boolean }) {
  const { t, fmt, intl } = useI18n();
  const [v, setV] = useState(defaultValue);
  const day = (iso: string) => new Intl.DateTimeFormat(intl, { weekday: "short", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
  const label = v ? `${withDay ? `${day(v)} · ` : ""}${fmt.fullDate(v)}` : t("public.date.pick");
  return (
    <div className={`input relative flex items-center justify-between gap-2 ${className}`}>
      {/* one line, always: in narrow form columns the weekday is what gets cut, not the date */}
      <span className={`num min-w-0 truncate whitespace-nowrap ${v ? "" : "text-muted"}`}>{label}</span>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M7 3v3M17 3v3M4 9h16M5 5h14v15H5z" /></svg>
      <input
        type="date" name={name} value={v} min={min} required={required} onChange={(e) => setV(e.target.value)}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
      />
    </div>
  );
}

/** 24-hour time picker in 15-minute steps (native time inputs show AM/PM in English browsers). */
export function TimeField({ name, defaultValue = "", className = "", from = 5, to = 9, placeholder }: { name: string; defaultValue?: string; className?: string; from?: number; to?: number; placeholder?: string }) {
  const times: string[] = [];
  for (let h = from; h <= to; h++) for (const m of ["00", "15", "30", "45"]) times.push(`${String(h).padStart(2, "0")}:${m}`);
  return (
    <select name={name} defaultValue={defaultValue} className={`input ${className}`} aria-label={placeholder}>
      <option value="">{placeholder ?? "-"}</option>
      {times.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}
