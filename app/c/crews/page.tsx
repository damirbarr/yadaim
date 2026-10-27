import { requireContractor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all } from "@/lib/db";
import { busyWorkers, displayName, getWorker } from "@/lib/queries";
import { nextWorkday, REGIONS, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import { deleteCrew } from "@/app/actions/contractor";
import { Avatar, Empty, PageHead } from "@/components/ui";
import { DateField } from "@/components/DateField";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.crews.title") };
}

export default async function Crews() {
  const { user, contractorId } = await requireContractor();
  const { t, fmt } = await getI18n();
  const edit = can(user, "contractor.crews.edit"), book = can(user, "contractor.book");
  const crewsRaw = (await all(`SELECT * FROM crews WHERE contractor_id = ? ORDER BY id DESC`, contractorId)) as { id: number; name: string; worker_ids: string }[];
  const today = todayISO();
  const date = nextWorkday(today);
  const busy = (await busyWorkers(date, date));
  const crews = await Promise.all(
    crewsRaw.map(async (c) => ({ c, ws: (await Promise.all(c.worker_ids.split(",").map(Number).map(getWorker))).filter((w) => w && w.active) }))
  );
  return (
    <div className="space-y-5">
      <PageHead title={t("contractor.crews.title")} sub={t("contractor.crews.sub")} />
      {crews.length === 0 ? (
        <Empty title={t("contractor.crews.emptyTitle")}>{t("contractor.crews.emptyBody")}</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {crews.map(({ c, ws }) => {
            const tr = ws[0]?.trade ?? "formwork";
            const free = ws.filter((w) => !busy.has(w!.id));
            return (
              <div key={c.id} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-bold text-ink">{c.name}</h2>
                    <div className="text-sm text-muted">{t(`contractor.count.${tr}` as MessageKey, { n: ws.length })}</div>
                  </div>
                  {edit && <form action={deleteCrew}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-muted hover:text-bad">{t("contractor.crews.delete")}</button></form>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ws.map((w) => (
                    <span key={w!.id} className={`flex items-center gap-2 rounded-[3px] border border-line py-1 pe-3 ps-1 text-sm ${busy.has(w!.id) ? "opacity-50" : ""}`}>
                      <Avatar w={w!} size={28} />{displayName(w!)}
                    </span>
                  ))}
                </div>
                {book && <form action="/c/checkout" className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                  <input type="hidden" name="trade" value={tr} />
                  <input type="hidden" name="w" value={ws.map((w) => w!.id).join(",")} />
                  <div><label className="label">{t("contractor.crews.date")}</label><DateField name="date" defaultValue={date} min={today} className="py-2" /></div>
                  <div><label className="label">{t("contractor.crews.days")}</label><input type="number" name="days" defaultValue={1} min={1} max={22} className="input w-20 py-2" /></div>
                  <div>
                    <label className="label">{t("contractor.crews.city")}</label>
                    <select name="city" defaultValue="נתניה" className="input w-36 py-2"> // i18n-data
                      {REGIONS.map((r) => (
                        <optgroup key={r.key} label={fmt.region(r.key)}>{r.cities.map((city) => <option key={city} value={city}>{fmt.city(city)}</option>)}</optgroup>
                      ))}
                    </select>
                  </div>
                  <button className="btn-hazard">{t("contractor.crews.rebook")}</button>
                </form>}
                <p className="text-xs text-muted">{t("contractor.crews.free", { day: fmt.relDay(date, today), free: free.length, total: ws.length })}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
