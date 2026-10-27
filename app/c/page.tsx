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
import { bookingDays } from "@/lib/attendance";
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
  // Crews on site today (or finished, with hours still to approve): the work day comes first on a phone.
  const onSite = can(user, "contractor.site")
    ? (await bookingsWhere(`b.contractor_id = ? AND b.status = 'approved' AND b.date <= ? ORDER BY b.date, b.id`, contractorId, today))
      .filter((b) => b.end_date < today || bookingDays(b).includes(today))
    : [];
  const upcoming = (await bookingsWhere(`b.contractor_id = ? AND b.status IN ('requested','approved') AND b.end_date >= ? ORDER BY b.date LIMIT 3`, contractorId, today));
  return (
    <div className="space-y-8">
      {onSite.length > 0 && (
        <section className="blueprint -mx-4 -mt-6 px-4 pb-3 pt-5 md:mx-0 md:mt-0 md:rounded-[3px] md:px-8" data-today>
          <div className="text-[13px] font-bold text-hazard">{t("contractor.day.home", { date: fmt.prettyDate(today) })}</div>
          <ul>
            {onSite.map((b) => {
              const crew = b.workers.filter((w) => w.state === "assigned");
              const marked = crew.filter((w) => w.attendance.some((a) => a.date === today && a.arrived != null));
              const arrived = crew.filter((w) => w.attendance.some((a) => a.date === today && a.arrived === 1)).length;
              const ended = b.end_date < today;
              const label = ended ? t("contractor.order.approveHours") : today === b.end_date && marked.length ? t("contractor.day.finish") : marked.length ? t("contractor.day.continue") : t("contractor.day.start");
              const days = bookingDays(b);
              return (
                <li key={b.id} className="border-t border-white/20 py-3 first:border-0">
                  <Link href={`/c/orders/${b.id}/site`} className="flex flex-wrap items-center gap-x-4 gap-y-3" data-act="work-day">
                    <div className="min-w-0 flex-1 basis-56">
                      <div className="truncate text-[19px] font-bold text-white">{b.address}</div>
                      <div className="text-sm text-white/70">
                        {t(`contractor.count.${b.trade}` as MessageKey, { n: crew.length })} · {b.agency_name}
                        {days.length > 1 && !ended ? ` · ${t("contractor.day.dayOf", { n: days.indexOf(today) + 1, days: days.length })}` : ""}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-hazard">
                        {ended ? t("contractor.day.homeHours") : marked.length ? t("contractor.day.homeProgress", { arrived, total: crew.length }) : t("contractor.day.homeDue", { n: crew.length })}
                      </div>
                    </div>
                    <span className="btn-hazard w-full py-3.5 text-[17px] sm:w-auto">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <section className={`blueprint -mx-4 ${onSite.length ? "" : "-mt-6"} overflow-hidden px-4 pb-8 pt-7 md:mx-0 md:mt-0 md:rounded-[3px] md:px-10 md:pb-10 md:pt-9`}>
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
                  {phase === "today" && <div className="mt-3 flex items-center gap-1 text-sm font-semibold"><IClock className="h-4 w-4" />{t("contractor.day.title")} <span className="flip-ltr inline-block">←</span></div>}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
