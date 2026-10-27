import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContractor } from "@/lib/auth";
import { agencyReliability, busyWorkers, displayName, docCheck, getAgency, getWorker, maskPassport, recentJobs, workedWith, workerDocs, workerStats } from "@/lib/queries";
import { parseSearch, toQS } from "@/lib/params";
import { diffDays, endOfBlock, hourlyFor, todayISO } from "@/lib/domain";
import { getI18n } from "@/lib/i18n/server";
import { Avatar, Rating, ScoreRing } from "@/components/ui";
import { IDoc, IX } from "@/components/icons";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("contractor.worker.title") };
}

export default async function WorkerProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { contractorId } = await requireContractor("contractor.book");
  const w = (await getWorker(Number((await params).id)));
  if (!w || !w.active) notFound();
  const { t, fmt } = await getI18n();
  const sp = await searchParams;
  const q = parseSearch({ ...sp, trade: w.trade });
  const a = (await getAgency(w.agency_id))!;
  const docs = (await workerDocs(w.id));
  const st = (await workerStats([w.id])).get(w.id)!;
  const rel = (await agencyReliability(a.id));
  const jobs = (await recentJobs(w.id, 6));
  const end = endOfBlock(q.date, q.days);
  const free = !(await busyWorkers(q.date, end)).has(w.id) && docCheck(docs, w.trade, end).ok;
  const hourly = hourlyFor(w.hourly_rate, a, q);
  const mine = (await workedWith(contractorId)).get(w.id) ?? 0;
  const qs = toQS({ trade: q.trade, city: q.city, date: q.date, days: q.days, count: q.count, lodging: q.lodging, transport: q.transport });
  const open = docs.find((d) => String(d.id) === sp.doc);
  const today = todayISO();

  return (
    <div className="space-y-5">
      <Link href={`/c/search?${qs}`} className="text-sm text-muted hover:text-ink"><span className="flip-ltr inline-block">→</span> {t("contractor.worker.backToResults")}</Link>
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="card h-fit overflow-hidden">
          <div className="relative">
            <Avatar w={w} size={340} className="!h-64 !w-full !rounded-none" />
            {mine > 0 && <span className="chip-hazard absolute start-3 top-3">{t("contractor.worker.workedWithYou", { n: mine })}</span>}
          </div>
          <div className="space-y-3 p-5">
            <div>
              <h1 className="text-2xl font-bold">{displayName(w)}</h1>
              <p className="text-muted">{fmt.trade(w.trade)} · {t("contractor.count.yearsExp", { n: w.years })} · {fmt.country(w.country)}</p>
            </div>
            <Rating value={st.rating} count={st.jobs} size="lg" />
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-[3px] bg-paper p-2"><dt className="text-xs text-muted">{t("contractor.worker.arrival")}</dt><dd className="num font-bold">{st.arrival != null ? fmt.num(Math.round(st.arrival * 100)) + "%" : "-"}</dd></div>
              <div className="rounded-[3px] bg-paper p-2"><dt className="text-xs text-muted">{t("contractor.worker.match")}</dt><dd className="num font-bold">{st.match != null ? fmt.num(Math.round(st.match * 100)) + "%" : "-"}</dd></div>
              <div className="rounded-[3px] bg-paper p-2"><dt className="text-xs text-muted">{t("contractor.worker.days")}</dt><dd className="num font-bold">{st.days}</dd></div>
              <div className="rounded-[3px] bg-paper p-2"><dt className="text-xs text-muted">{t("contractor.worker.passport")}</dt><dd className="num font-bold">{maskPassport(w.passport_no)}</dd></div>
            </dl>
            {w.skills && <div className="flex flex-wrap gap-1">{w.skills.split(",").map((s) => <span key={s} className="chip-muted">{s}</span>)}</div>}
            <div className="flex items-center gap-3 rounded-[3px] border border-line p-3">
              <ScoreRing score={rel.score} size={52} />
              <div className="text-sm">
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-muted">{t("contractor.worker.license", { license: a.license_no, tier: t(`domain.reliability.${rel.tier.tone}`) })}</div>
              </div>
            </div>
            <div className="border-t border-line pt-3">
              <div className="font-display text-2xl font-bold num">{fmt.money(hourly * q.hours)}</div>
              <div className="text-xs text-muted">{t("contractor.worker.perDay", { hours: q.hours, rate: fmt.money(hourly) })} · {q.lodging === "agency" ? t("contractor.worker.lodgingAgency") : t("contractor.worker.lodgingOurs")} · {q.transport === "agency" ? t("contractor.worker.withTransport") : t("contractor.worker.noTransport")}</div>
              {free ? (
                <Link href={`/c/checkout?${qs}&w=${w.id}`} className="btn-hazard mt-3 w-full">{q.days > 1 ? t("contractor.worker.bookForDays", { date: fmt.prettyDate(q.date), days: t("contractor.count.days", { n: q.days }) }) : t("contractor.worker.bookFor", { date: fmt.prettyDate(q.date) })}</Link>
              ) : (
                <div className="mt-3 rounded-[3px] bg-paper p-3 text-center text-sm text-muted">{t("contractor.worker.notFree")}</div>
              )}
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="card">
            <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("contractor.worker.docsTitle")}</h2>
            <ul>
              {docs.map((d) => {
                const left = d.expires ? diffDays(today, d.expires) : null;
                return (
                  <li key={d.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                    <span className={left != null && left < 0 ? "chip-bad" : left != null && left <= 60 ? "chip-warn" : "chip-ok"}>{left != null && left < 0 ? t("contractor.worker.expired") : t("contractor.worker.valid")}</span>
                    <span className="flex-1 text-sm font-medium">{fmt.doc(d.type)}</span>
                    <span className="text-xs text-muted num">{t("contractor.worker.until", { date: d.expires ? (d.type === "passport" ? fmt.month(d.expires) : fmt.fullDate(d.expires)) : "-" })}</span>
                    <Link href={`?${qs}&doc=${d.id}`} scroll={false} className="btn-ghost btn-sm"><IDoc className="h-4 w-4" />{t("contractor.worker.view")}</Link>
                  </li>
                );
              })}
            </ul>
            <p className="px-5 pb-4 pt-2 text-xs text-muted">{t("contractor.worker.docsNote")}</p>
          </section>

          <section className="card">
            <h2 className="border-b border-line px-5 py-3 text-[20px] font-bold text-ink">{t("contractor.worker.jobsTitle")}</h2>
            {jobs.length === 0 ? <p className="p-5 text-sm text-muted">{t("contractor.worker.noJobs")}</p> : (
              <ul>
                {jobs.map((j, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3 text-sm last:border-0">
                    <span className="num w-12 text-muted">{fmt.date(j.date)}</span>
                    <span className="flex-1">{fmt.trade(j.trade)} · {fmt.city(j.city)} · {j.company}</span>
                    {j.rating && <Rating value={j.rating} />}
                    {(j.review || j.tags) && <span className="w-full text-xs text-muted sm:w-auto">“{j.review || j.tags!.split(",").map(fmt.tag).join(", ")}”</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4">
          <div className="card w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-[18px] font-bold text-ink">{fmt.doc(open.type)}</h3>
              <Link href={`?${qs}`} scroll={false} className="grid h-8 w-8 place-items-center rounded-[3px] hover:bg-paper" aria-label={t("common.close")}><IX /></Link>
            </div>
            <div className="p-5">
              {open.file ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${open.file}`} alt="" className="max-h-[60vh] w-full rounded-[3px] object-contain" />
              ) : (
                <div className="relative rounded-[3px] border border-line bg-paper p-5">
                  <div className="flex gap-4">
                    <Avatar w={w} size={72} />
                    <div className="flex-1 space-y-2 pt-1">
                      {[80, 60, 70, 45].map((x, i) => <div key={i} className="h-2 rounded bg-line" style={{ width: `${x}%` }} />)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted">{t("contractor.worker.number")} </span><span className="num">{open.number ? open.number.slice(0, 3) + "•••" + open.number.slice(-3) : "-"}</span></div>
                    <div><span className="text-muted">{t("contractor.worker.validUntil")} </span><span className="num">{open.expires ? fmt.fullDate(open.expires) : "-"}</span></div>
                  </div>
                  {open.verified_at && <div className="absolute bottom-4 end-4 -rotate-6 rounded border-2 border-ok px-2 py-1 text-xs font-bold text-ok">{t("contractor.worker.checked", { date: fmt.fullDate(open.verified_at.slice(0, 10)) })}</div>}
                </div>
              )}
              <p className="mt-3 text-xs text-muted">{t("contractor.worker.privacy")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
