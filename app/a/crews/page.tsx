import Link from "next/link";
import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { agencyCrews } from "@/lib/crews";
import { busyWorkers, displayName } from "@/lib/queries";
import { todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { Avatar, Empty, Notice, PageHead } from "@/components/ui";
import { IPlus } from "@/components/icons";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("crews.title") };
}

export default async function Crews({ searchParams }: { searchParams: Promise<{ saved?: string; dissolved?: string }> }) {
  const { user, agencyId } = await requireAgency("agency.view");
  const edit = can(user, "agency.workers.edit");
  const sp = await searchParams;
  const { t, fmt } = await getI18n();
  const today = todayISO();
  const crews = await agencyCrews(agencyId);
  const busy = await busyWorkers(today, today);
  const inCrews = crews.reduce((s, c) => s + c.members.length, 0);
  return (
    <div className="space-y-5">
      <PageHead eyebrow={t("crews.eyebrow", { date: fmt.date(today) })} title={t("crews.title")} sub={`${t("crews.count", { n: crews.length })} · ${t("crews.inCrews", { n: inCrews })}`}>
        {edit && <Link href="/a/crews/new" className="btn-primary"><IPlus className="h-4 w-4" />{t("crews.new")}</Link>}
      </PageHead>
      {sp.saved && <Notice tone="ok">{t("crews.saved")}</Notice>}
      {sp.dissolved && <Notice tone="ok">{t("crews.dissolved")}</Notice>}
      {crews.length === 0 ? (
        <Empty title={t("crews.emptyTitle")}>{t("crews.emptyBody")}</Empty>
      ) : (
        <section className="sheet">
          <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3">
            <h2 className="text-[20px] font-bold text-ink">{t("crews.listTitle")}</h2>
            <span className="text-[13px] text-muted">{t("crews.listNote")}</span>
          </div>
          <ul className="divide-y divide-dashed divide-line">
            {crews.map((c) => {
              const free = c.members.filter((m) => !busy.has(m.id)).length;
              const leader = c.members.find((m) => m.id === c.leader_worker_id);
              const trades = [...new Set(c.members.map((m) => m.trade))];
              return (
                <li key={c.id} data-crew={c.id} className={`grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${sp.saved === String(c.id) ? "bg-hazard-soft" : ""}`}>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-display text-[22px] font-bold leading-tight text-ink">{c.name}</h3>
                      {c.mainTrade && <span className="chip-muted">{fmt.trades(c.mainTrade)}</span>}
                      <span className="text-[13px] text-muted">{t("crews.members", { n: c.members.length })}{leader ? ` · ${t("crews.ledBy", { name: displayName(leader) })}` : ""}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {c.members.map((m) => (
                        <Link key={m.id} href={`/a/workers/${m.id}`} className="flex items-center gap-2 hover:underline">
                          <Avatar w={m} size={30} />
                          <span className="text-[14px] leading-tight">
                            <span className="block font-semibold">{displayName(m)}</span>
                            <span className="block text-[12px] text-muted">{fmt.trade(m.trade)}{m.id === c.leader_worker_id ? ` · ${t("crews.leader")}` : ""}</span>
                          </span>
                        </Link>
                      ))}
                      {c.members.length === 0 && <span className="text-sm text-muted">{t("crews.noMembers")}</span>}
                    </div>
                    {trades.length > 1 && <div className="text-[12px] text-muted">{t("crews.mixed", { trades: trades.map((k) => fmt.trades(k)).join(" · ") })}</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
                    <span className={free === c.members.length ? "chip-ok" : free === 0 ? "chip-muted" : "chip-warn"}>{t("crews.freeToday", { free, n: c.members.length })}</span>
                    {edit && <Link href={`/a/crews/${c.id}`} className="btn-ghost btn-sm">{t("crews.edit")}</Link>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Notice>{t("crews.explain")}</Notice>
    </div>
  );
}
