import { REGIONS, TRADES, nextWorkday, todayISO } from "@/lib/domain";
import { DateField } from "./DateField";

export type SearchDefaults = { trade?: string; city?: string; date?: string; days?: number; count?: number };

export function SearchForm({ d = {}, compact = false }: { d?: SearchDefaults; compact?: boolean }) {
  const min = todayISO();
  return (
    <form action="/c/search" className={`sheet grid gap-3 border-b-[3px] border-b-hazard p-3 md:p-4 ${compact ? "md:grid-cols-[1.2fr_1.2fr_1fr_1fr_.8fr_auto]" : "sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_.8fr_auto]"}`}>
      <div>
        <label className="label">מקצוע</label>
        <select name="trade" className="input" defaultValue={d.trade ?? "formwork"}>
          {TRADES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">איפה (עיר האתר)</label>
        <select name="city" className="input" defaultValue={d.city ?? "נתניה"}>
          {REGIONS.map((r) => (
            <optgroup key={r.key} label={r.label}>{r.cities.map((c) => <option key={c}>{c}</option>)}</optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label">מתאריך</label>
        <DateField name="date" min={min} defaultValue={d.date ?? nextWorkday(min)} required withDay />
      </div>
      <div>
        <label className="label">לכמה זמן</label>
        <select name="days" className="input" defaultValue={String(d.days ?? 1)}>
          <option value="1">יום אחד</option>
          <option value="2">יומיים</option>
          <option value="3">3 ימי עבודה</option>
          <option value="5">שבוע (5 ימים)</option>
          <option value="10">שבועיים</option>
          <option value="22">חודש</option>
        </select>
      </div>
      <div>
        <label className="label">כמה עובדים</label>
        <input type="number" name="count" className="input" min={1} max={20} defaultValue={d.count ?? 2} />
      </div>
      <button className="btn-primary self-end py-2.5 text-base">חיפוש ←</button>
    </form>
  );
}
