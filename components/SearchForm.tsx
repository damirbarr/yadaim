import { REGIONS, TRADES, nextWorkday, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { DateField } from "./DateField";

export type SearchDefaults = { trade?: string; city?: string; date?: string; days?: number; count?: number };

const LENGTHS = ["1", "2", "3", "5", "10", "22"] as const;

export async function SearchForm({ d = {}, compact = false }: { d?: SearchDefaults; compact?: boolean }) {
  const { t, fmt } = await getI18n();
  const min = todayISO();
  return (
    <form action="/c/search" className={`sheet grid gap-3 border-b-[3px] border-b-hazard p-3 md:p-4 ${compact ? "md:grid-cols-[1.2fr_1.2fr_1fr_1fr_.8fr_auto]" : "sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_.8fr_auto]"}`}>
      <div>
        <label className="label">{t("contractor.form.trade")}</label>
        <select name="trade" className="input" defaultValue={d.trade ?? "formwork"}>
          {TRADES.map((tr) => <option key={tr.key} value={tr.key}>{fmt.trade(tr.key)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t("contractor.form.city")}</label>
        <select name="city" className="input" defaultValue={d.city ?? "נתניה"}> // i18n-data
          {REGIONS.map((r) => (
            <optgroup key={r.key} label={fmt.region(r.key)}>{r.cities.map((c) => <option key={c} value={c}>{fmt.city(c)}</option>)}</optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t("contractor.form.from")}</label>
        <DateField name="date" min={min} defaultValue={d.date ?? nextWorkday(min)} required withDay />
      </div>
      <div>
        <label className="label">{t("contractor.form.length")}</label>
        <select name="days" className="input" defaultValue={String(d.days ?? 1)}>
          {LENGTHS.map((v) => <option key={v} value={v}>{t(`contractor.form.lengths.${v}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t("contractor.form.count")}</label>
        <input type="number" name="count" className="input" min={1} max={20} defaultValue={d.count ?? 2} />
      </div>
      <button className="btn-primary self-end py-2.5 text-base">{t("contractor.form.search")} <span className="flip-ltr inline-block">←</span></button>
    </form>
  );
}
