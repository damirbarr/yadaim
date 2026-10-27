import { redirect } from "next/navigation";
import Link from "next/link";
import { requireContractor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { bookingsWhere } from "@/lib/queries";
import { bookingPhase, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/core";
import { SearchForm } from "@/components/SearchForm";
import { Avatar } from "@/components/ui";
import { IBed, ICheck, IClock, IShield } from "@/components/icons";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.home.title") };
}

export default async function ContractorHome() {
  const { user, contractorId } = await requireContractor();
  if (!can(user, "contractor.book")) redirect("/c/orders");
  const { t, rich, fmt } = await getI18n();
  const today = todayISO();
  const upcoming = (await bookingsWhere(`b.contractor_id = ? AND b.status IN ('requested','approved') AND b.end_date >= ? ORDER BY b.date LIMIT 3`, contractorId, today));
  return (
    <div className="space-y-8">
      <section className="blueprint -mx-4 -mt-6 overflow-hidden px-4 pb-8 pt-7 md:mx-0 md:mt-0 md:rounded-[3px] md:px-10 md:pb-10 md:pt-9">
        <div className="text-[13px] font-bold text-hazard">{t("contractor.home.eyebrow")}</div>
        <h1 className="mt-2 text-[38px] font-bold leading-[1.05] text-white md:text-[56px]">{rich("contractor.home.heading", { hl: (c) => <em className="not-italic text-hazard">{c}</em> })}</h1>
        <p className="mt-2 max-w-xl text-[16px] text-white/75">{t("contractor.home.lead")}</p>
        <div className="mt-6 text-text">
          <SearchForm />
        </div>
        <div className="mt-6 grid gap-3 border-t border-white/20 pt-5 text-[14px] sm:grid-cols-3">
          {[
            [<ICheck key="i" className="h-4 w-4" />, t("contractor.home.perkSee")],
            [<IBed key="i" className="h-4 w-4" />, t("contractor.home.perkPrice")],
            [<IShield key="i" className="h-4 w-4" />, t("contractor.home.perkFit")],
          ].map(([icon, text], i) => (
            <div key={i} className="flex items-center gap-2.5 text-white/85"><span className="grid h-7 w-7 shrink-0 place-items-center border border-hazard text-hazard">{icon}</span>{text}</div>
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="eyebrow mb-1">{t("contractor.home.upcomingEyebrow")}</div>
          <h2 className="mb-3 text-[24px] font-bold text-ink">{t("contractor.home.upcomingTitle")}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {upcoming.map((b) => {
              const phase = bookingPhase(b);
              return (
                <Link key={b.id} href={`/c/orders/${b.id}`} className="sheet block p-4 transition hover:border-ink">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[20px] font-bold text-ink">{fmt.relDay(b.date, today)}{b.days > 1 ? ` · ${t("contractor.count.days", { n: b.days })}` : ""}</span>
                    <span className={phase === "requested" ? "chip-warn" : phase === "today" ? "chip-hazard" : "chip-ok"}>{fmt.phase(phase)}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted">{t(`contractor.count.${b.trade}` as MessageKey, { n: b.workers.length })} · {fmt.city(b.city)} · {b.agency_name}</div>
                  <div className="mt-3 flex -space-x-2">
                    {b.workers.slice(0, 5).map((w) => <Avatar key={w.bw_id} w={w} size={34} className="ring-2 ring-white" />)}
                  </div>
                  {phase === "today" && <div className="mt-3 flex items-center gap-1 text-sm font-semibold"><IClock className="h-4 w-4" />{t("contractor.home.checkin")} <span className="flip-ltr inline-block">←</span></div>}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
