import { requireContractor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get, insert, run, tx } from "@/lib/db";
import { busyWorkers, displayName, getWorker } from "@/lib/queries";
import { nextWorkday, todayISO, trade } from "@/lib/domain";
import { deleteCrew } from "@/app/actions/contractor";
import { Avatar, Empty, PageHead } from "@/components/ui";
import { DateField } from "@/components/DateField";

export const metadata = { title: "צוותים שמורים" };

export default async function Crews() {
  const { user, contractorId } = await requireContractor();
  const edit = can(user, "contractor.crews.edit"), book = can(user, "contractor.book");
  const crewsRaw = (await all(`SELECT * FROM crews WHERE contractor_id = ? ORDER BY id DESC`, contractorId)) as { id: number; name: string; worker_ids: string }[];
  const date = nextWorkday(todayISO());
  const busy = (await busyWorkers(date, date));
  const crews = await Promise.all(
    crewsRaw.map(async (c) => ({ c, ws: (await Promise.all(c.worker_ids.split(",").map(Number).map(getWorker))).filter((w) => w && w.active) }))
  );
  return (
    <div className="space-y-5">
      <PageHead title="צוותים שמורים" sub="צוות שעבד טוב? שומרים אותו ומזמינים שוב בלחיצה — התאגיד רואה שאתם מבקשים את אותם אנשים." />
      {crews.length === 0 ? (
        <Empty title="עדיין אין צוותים שמורים">אחרי שמאשרים שעות להזמנה, אפשר לשמור את הצוות מתוך דף ההזמנה.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {crews.map(({ c, ws }) => {
            const t = ws[0]?.trade ?? "formwork";
            const free = ws.filter((w) => !busy.has(w!.id));
            return (
              <div key={c.id} className="card space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[22px] font-bold text-ink">{c.name}</h2>
                    <div className="text-sm text-muted">{ws.length} {trade(t).plural}</div>
                  </div>
                  {edit && <form action={deleteCrew}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-muted hover:text-bad">מחיקה</button></form>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ws.map((w) => (
                    <span key={w!.id} className={`flex items-center gap-2 rounded-[3px] border border-line py-1 pe-3 ps-1 text-sm ${busy.has(w!.id) ? "opacity-50" : ""}`}>
                      <Avatar w={w!} size={28} />{displayName(w!)}
                    </span>
                  ))}
                </div>
                {book && <form action="/c/checkout" className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
                  <input type="hidden" name="trade" value={t} />
                  <input type="hidden" name="w" value={ws.map((w) => w!.id).join(",")} />
                  <div><label className="label">תאריך</label><DateField name="date" defaultValue={date} min={todayISO()} className="py-2" /></div>
                  <div><label className="label">ימים</label><input type="number" name="days" defaultValue={1} min={1} max={22} className="input w-20 py-2" /></div>
                  <div><label className="label">עיר</label><input name="city" defaultValue="נתניה" className="input w-28 py-2" /></div>
                  <button className="btn-hazard">הזמנה חוזרת</button>
                </form>}
                <p className="text-xs text-muted">מחר פנויים: {free.length} מתוך {ws.length}. מי שלא פנוי יוסר אוטומטית בסיכום.</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
