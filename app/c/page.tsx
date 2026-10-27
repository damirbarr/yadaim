import { redirect } from "next/navigation";
import Link from "next/link";
import { requireContractor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { bookingsWhere } from "@/lib/queries";
import { bookingPhase, PHASE_LABEL, relDay, todayISO, trade } from "@/lib/domain";
import { SearchForm } from "@/components/SearchForm";
import { Avatar } from "@/components/ui";
import { IBed, ICheck, IClock, IShield } from "@/components/icons";

export const metadata = { title: "הזמנה חדשה" };

export default async function ContractorHome() {
  const { user, contractorId } = await requireContractor();
  if (!can(user, "contractor.book")) redirect("/c/orders");
  const upcoming = (await bookingsWhere(`b.contractor_id = ? AND b.status IN ('requested','approved') AND b.end_date >= ? ORDER BY b.date LIMIT 3`, contractorId, todayISO()));
  return (
    <div className="space-y-8">
      <section className="blueprint -mx-4 -mt-6 overflow-hidden px-4 pb-8 pt-7 md:mx-0 md:mt-0 md:rounded-[3px] md:px-10 md:pb-10 md:pt-9">
        <div className="text-[13px] font-bold tracking-[.02em] text-hazard">הזמנה חדשה · עובדים מתאגידים מורשים</div>
        <h1 className="mt-2 text-[38px] font-bold leading-[1.05] text-white md:text-[56px]">צריך ידיים <em className="not-italic text-hazard">לאתר?</em></h1>
        <p className="mt-2 max-w-xl text-[16px] text-white/75">רואים מראש מי מגיע: תמונה, ותק, דירוג ואישורים בתוקף. מחיר יומי סופי.</p>
        <div className="mt-6 text-text">
          <SearchForm />
        </div>
        <div className="mt-6 grid gap-3 border-t border-white/20 pt-5 text-[14px] sm:grid-cols-3">
          {[
            [<ICheck key="i" className="h-4 w-4" />, "רואים מראש מי מגיע — תמונה, ותק ודירוג"],
            [<IBed key="i" className="h-4 w-4" />, "מחיר יומי סופי, כולל לינה והסעה"],
            [<IShield key="i" className="h-4 w-4" />, "לא מתאים בבוקר? לא משלמים על היום"],
          ].map(([icon, t], i) => (
            <div key={i} className="flex items-center gap-2.5 text-white/85"><span className="grid h-7 w-7 shrink-0 place-items-center border border-hazard text-hazard">{icon}</span>{t}</div>
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="eyebrow mb-1">לוח זמנים</div>
          <h2 className="mb-3 text-[24px] font-bold text-ink">בקרוב באתר</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {upcoming.map((b) => {
              const phase = bookingPhase(b);
              return (
                <Link key={b.id} href={`/c/orders/${b.id}`} className="sheet block p-4 transition hover:border-ink">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[20px] font-bold text-ink">{relDay(b.date)}{b.days > 1 ? ` · ${b.days} ימים` : ""}</span>
                    <span className={phase === "requested" ? "chip-warn" : phase === "today" ? "chip-hazard" : "chip-ok"}>{PHASE_LABEL[phase]}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted">{b.workers.length} {trade(b.trade).plural} · {b.city} · {b.agency_name}</div>
                  <div className="mt-3 flex -space-x-2 space-x-reverse">
                    {b.workers.slice(0, 5).map((w) => <Avatar key={w.bw_id} w={w} size={34} className="ring-2 ring-white" />)}
                  </div>
                  {phase === "today" && <div className="mt-3 flex items-center gap-1 text-sm font-semibold"><IClock className="h-4 w-4" />צ׳ק־אין באתר ←</div>}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
