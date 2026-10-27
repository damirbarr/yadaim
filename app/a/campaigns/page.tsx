import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get, insert, run, tx } from "@/lib/db";
import { agencyReliability, displayName, getAgency, idleForecast, workerStats, getWorker } from "@/lib/queries";
import { ddmm, IDLE_DAY_COST, ils, REGIONS, trade, TRADES } from "@/lib/domain";
import { createCampaign } from "@/app/actions/agency";
import { Avatar, Empty, PageHead } from "@/components/ui";

export const metadata = { title: "שיווק לקבלנים" };

export default async function Campaigns({ searchParams }: { searchParams: Promise<{ trade?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const send = can(user, "agency.campaigns.send");
  const sp = await searchParams;
  const a = (await getAgency(agencyId))!;
  const idle = (await idleForecast(agencyId, 10));
  const rel = (await agencyReliability(agencyId));
  const sel = idle.find((i) => i.trade === sp.trade) ?? idle[0];
  const past = (await all(
    `SELECT c.*, COUNT(r.id) AS total, COUNT(r.sent_at) AS sent, COUNT(r.opened_at) AS opened, COUNT(r.booked_at) AS booked
     FROM campaigns c LEFT JOIN campaign_recipients r ON r.campaign_id = c.id WHERE c.agency_id = ? GROUP BY c.id ORDER BY c.id DESC`
  , agencyId)) as { id: number; trade: string; date_from: string; date_to: string; status: string; created_at: string; total: number; sent: number; opened: number; booked: number }[];
  const eligible = ((await get(`SELECT COUNT(*) AS n FROM crm_contacts WHERE agency_id = ? AND opted_out = 0 AND (last_sent_at IS NULL OR last_sent_at <= now_txt(interval '-3 days'))`, agencyId)) as { n: number }).n;
  let message = "", avg = 0, top: Awaited<ReturnType<typeof getWorker>>[] = [];
  if (sel) {
    const st = (await workerStats(sel.workerIds));
    const rated = sel.workerIds.map((id) => st.get(id)!.rating).filter((x): x is number => x != null);
    avg = rated.length ? rated.reduce((x, y) => x + y, 0) / rated.length : 0;
    top = await Promise.all(sel.workerIds.sort((x, y) => (st.get(y)!.rating ?? 0) - (st.get(x)!.rating ?? 0)).slice(0, 4).map(getWorker));
    message = `היי {שם}, יש לנו ${sel.workerCount} ${trade(sel.trade).plural} פנויים בין ${ddmm(sel.from)} ל-${ddmm(sel.to)}. כולם עם אישורים בתוקף${avg ? ` ודירוג ממוצע ${avg.toFixed(1)} מקבלנים` : ""}. מחיר יומי סופי כולל הסעה, ואפשר להזמין גם ליום אחד:`;
  }
  return (
    <div className="space-y-6">
      <PageHead title="יש ימים פנויים? המערכת משווקת בשבילכם" sub="המערכת מזהה ימי עבודה פנויים, מכינה הצעה עם הפרופילים והדירוגים, ובוחרת את הקבלנים הרלוונטיים מהמאגר. שום דבר לא יוצא בלי האישור שלכם." />
      {idle.length === 0 ? <Empty title="אין ימים פנויים ב-10 ימי העבודה הקרובים">יפה מאוד. כשיהיו — ההצעה תחכה כאן.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {idle.map((i) => (
            <Link key={i.trade} href={`/a/campaigns?trade=${i.trade}`} className={`card p-4 transition hover:border-ink ${sel?.trade === i.trade ? "border-ink ring-2 ring-ink" : ""}`}>
              <div className="text-sm text-muted">{trade(i.trade).plural}</div>
              <div className="font-display text-3xl font-bold num">{i.idleDays}</div>
              <div className="text-xs text-muted">ימי עבודה פנויים · {i.workerCount} עובדים</div>
              <div className="mt-1 text-xs text-bad">עלות משוערת <span className="num">{ils(i.idleDays * IDLE_DAY_COST)}</span></div>
            </Link>
          ))}
        </div>
      )}

      {sel && send && (
        <form action={createCampaign} className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <input type="hidden" name="trade" value={sel.trade} />
          <input type="hidden" name="from" value={sel.from} />
          <input type="hidden" name="to" value={sel.to} />
          <input type="hidden" name="idle" value={sel.idleDays} />
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold text-ink">הצעה מוכנה לאישור · {trade(sel.trade).plural}</h2>
              {a.auto_campaign ? <span className="chip-hazard">דיוור אוטומטי פעיל</span> : null}
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-[3px] bg-paper p-3"><dt className="text-xs text-muted">מה מציעים</dt><dd className="font-semibold">{sel.workerCount} עובדים · {sel.idleDays} ימים</dd><dd className="num text-xs text-muted">{ddmm(sel.from)}–{ddmm(sel.to)}</dd></div>
              <div className="rounded-[3px] bg-paper p-3"><dt className="text-xs text-muted">למי</dt><dd className="font-semibold num">{eligible} קבלנים</dd><dd className="text-xs text-muted">שלא קיבלו הודעה ב-3 ימים</dd></div>
              <div className="rounded-[3px] bg-paper p-3"><dt className="text-xs text-muted">ערוץ</dt><dd className="font-semibold">וואטסאפ</dd><dd className="text-xs text-ok">✓ קישור אישי לכל קבלן</dd></div>
            </dl>
            <div>
              <label className="label">ההודעה ({"{שם}"} יוחלף בשם הקבלן, והקישור יתווסף אוטומטית)</label>
              <textarea name="message" rows={4} className="input" defaultValue={message} />
            </div>
            <fieldset>
              <legend className="label">אזורים</legend>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <label key={r.key} className="chip-muted cursor-pointer px-3 py-1.5 has-[:checked]:bg-ink has-[:checked]:text-white">
                    <input type="checkbox" name="regions" value={r.key} defaultChecked={a.regions.split(",").includes(r.key)} className="sr-only" />{r.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <ul className="space-y-1 text-xs text-muted">
              <li>✓ לשלוח רק אחרי אישור שלי</li>
              <li>✓ עד הודעה אחת ב-3 ימים לכל קבלן</li>
              <li>✓ לא לשלוח למי שביקש הסרה</li>
            </ul>
            <button className="btn-hazard px-6">יצירת ההצעה ושליחה</button>
          </div>
          <aside className="card h-fit bg-[#e7ddd0] p-4">
            <div className="mb-2 text-xs text-muted">כך זה נראה אצל הקבלן</div>
            <div className="rounded-[3px] rounded-tr-sm bg-white p-3 text-sm shadow-sm">
              <p>{message.replace("{שם}", "משה")}</p>
              <div className="mt-2 overflow-hidden rounded-[3px] border border-line">
                <div className="flex gap-1 bg-paper p-2">{top.map((w) => w && <div key={w.id} className="text-center text-[10px]"><Avatar w={w} size={48} /><div>{displayName(w)}</div></div>)}</div>
                <div className="p-2 text-xs"><b>{a.name}</b><div className="text-muted">אמינות {rel.score} · {trade(sel.trade).plural} פנויים</div></div>
              </div>
              <div className="mt-2 text-xs text-info underline">לצפייה בעובדים ולהזמנה ←</div>
            </div>
          </aside>
        </form>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[20px] font-bold text-ink">הצעות קודמות</h2>
          <div className="card overflow-x-auto">
            <table className="tbl min-w-[560px]">
              <thead><tr><th>תאריך</th><th>מקצוע</th><th>טווח</th><th>נשלחו</th><th>נפתחו</th><th>הזמנות</th><th /></tr></thead>
              <tbody>
                {past.map((c) => (
                  <tr key={c.id}>
                    <td className="num">{ddmm(c.created_at.slice(0, 10))}</td>
                    <td>{TRADES.find((t) => t.key === c.trade)?.plural}</td>
                    <td className="num text-muted">{ddmm(c.date_from)}–{ddmm(c.date_to)}</td>
                    <td className="num">{c.sent}/{c.total}</td>
                    <td className="num">{c.opened}</td>
                    <td>{c.booked ? <span className="chip-ok">{c.booked}</span> : 0}</td>
                    <td><Link href={`/a/campaigns/${c.id}`} className="text-xs underline">פתיחה</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
