import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { agencyReliability, displayName, idleForecast, workerStats, type Agency, type Worker } from "@/lib/queries";
import { hourlyFor, TRADES, DEFAULT_OPTS } from "@/lib/domain";
import { Avatar, Logo, Rating, ScoreRing } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import type { I18n } from "@/lib/i18n/core";

const agencyBySlug = async (slug: string) => (await get(`SELECT * FROM agencies WHERE slug = ?`, slug)) as Agency | undefined;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await agencyBySlug((await params).slug);
  return a ? { title: a.name } : {};
}

export default async function Offer({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ trade?: string; offer?: string }> }) {
  const a = await agencyBySlug((await params).slug);
  if (!a) notFound();
  const sp = await searchParams;
  const u = await currentUser();
  const { t, rich, fmt } = await getI18n();
  const rel = (await agencyReliability(a.id));
  const idle = (await idleForecast(a.id, 10));
  const focus = TRADES.some((t) => t.key === sp.trade) ? sp.trade! : idle[0]?.trade ?? "formwork";
  const f = idle.find((i) => i.trade === focus);
  const workers = (await all(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND trade = ?`, a.id, focus)) as Worker[];
  const st = (await workerStats(workers.map((w) => w.id)));
  const top = workers.filter((w) => !f || f.workerIds.includes(w.id)).sort((x, y) => (st.get(y.id)!.rating ?? 0) - (st.get(x.id)!.rating ?? 0)).slice(0, 6);
  const from = Math.min(...top.map((w) => hourlyFor(w.hourly_rate, a, DEFAULT_OPTS) * 9));
  const cta = u?.role === "contractor" ? `/c/search?trade=${focus}&date=${f?.from ?? ""}&count=2` : `/signup?role=contractor`;
  // An offer about a crew or picked workers (?offer= from the tracking link): exactly the people it named.
  const g = sp.offer ? (await get(`SELECT c.id, c.trade, c.target, c.worker_ids, c.date_from, c.date_to, k.name AS crew_name, k.leader_worker_id FROM campaigns c LEFT JOIN agency_crews k ON k.id = c.crew_id WHERE c.id = ? AND c.agency_id = ? AND c.target <> 'trade'`, Number(sp.offer), a.id)) as
    { id: number; trade: string; target: string; worker_ids: string | null; date_from: string; date_to: string; crew_name: string | null; leader_worker_id: number | null } | undefined : undefined;
  const gIds = (g?.worker_ids ?? "").split(",").map(Number).filter(Boolean);
  const gWorkers = gIds.length ? ((await all(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND id IN (${gIds.map(() => "?").join(",")})`, a.id, ...gIds)) as Worker[]).sort((x, y) => gIds.indexOf(x.id) - gIds.indexOf(y.id)) : [];
  const gst = await workerStats(gWorkers.map((w) => w.id));
  if (g && gWorkers.length) {
    const ctaGroup = u?.role === "contractor" ? `/c/search?trade=${g.trade}&date=${g.date_from}&count=${gWorkers.length}&w=${gWorkers.map((w) => w.id).join(",")}` : `/signup?role=contractor`;
    const range = fmt.range(fmt.date(g.date_from), fmt.date(g.date_to));
    const gFrom = Math.min(...gWorkers.map((w) => hourlyFor(w.hourly_rate, a, DEFAULT_OPTS) * 9));
    return (
      <div className="min-h-dvh">
        <OfferHeader logged={!!u} login={t("public.offer.login")} />
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
          <AgencyHead a={a} score={rel.score} t={t} fmt={fmt} />
          <div className="rounded-[3px] bg-hazard p-5" data-testid="offer-group">
            <div className="font-display text-2xl font-bold">{g.target === "crew" && g.crew_name ? t("public.offer.crewTitle", { crew: g.crew_name }) : t("public.offer.groupTitle", { n: gWorkers.length })}</div>
            <div className="text-sm">
              {g.date_from === g.date_to ? t("public.offer.togetherDay", { n: gWorkers.length, from: range.from }) : t("public.offer.together", { n: gWorkers.length, ...range })}
              {" · "}{t("public.offer.allValid")}
              {isFinite(gFrom) && <> · {rich("public.offer.priceFrom", { b: (c) => <b className="num">{c}</b> }, { price: fmt.money(gFrom) })}</>}
              {" · "}{a.min_days > 1 ? t("public.offer.minDays", { min: fmt.minDays(a.min_days) }) : t("public.offer.oneDay")}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {gWorkers.map((w) => (
              <div key={w.id} className="card flex gap-3 p-3">
                <Avatar w={w} size={64} />
                <div className="min-w-0">
                  <div className="font-semibold">{displayName(w)}{w.id === g.leader_worker_id && <span className="chip-hazard ms-2">{t("public.offer.leader")}</span>}</div>
                  <div className="text-xs text-muted">{fmt.trade(w.trade)} · {t("public.offer.years", { n: w.years })} · {fmt.country(w.country)}</div>
                  <Rating value={gst.get(w.id)!.rating} count={gst.get(w.id)!.jobs} />
                </div>
              </div>
            ))}
          </div>
          <Link href={ctaGroup} className="btn-primary w-full py-3 text-base">{u?.role === "contractor" ? t("public.offer.ctaBookGroup") : t("public.offer.ctaSignup")}</Link>
          <p className="text-center text-xs text-muted">{t("public.offer.foot")}</p>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-dvh">
      <OfferHeader logged={!!u} login={t("public.offer.login")} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <AgencyHead a={a} score={rel.score} t={t} fmt={fmt} />
        {f && (
          <div className="rounded-[3px] bg-hazard p-5">
            <div className="font-display text-2xl font-bold">{t("public.offer.available", { n: f.workerCount, trade: fmt.trade(focus), trades: fmt.trades(focus), from: fmt.date(f.from), to: fmt.date(f.to) })}</div>
            <div className="text-sm">
              {t("public.offer.allValid")}
              {isFinite(from) && <> · {rich("public.offer.priceFrom", { b: (c) => <b className="num">{c}</b> }, { price: fmt.money(from) })}</>}
              {" · "}{a.min_days > 1 ? t("public.offer.minDays", { min: fmt.minDays(a.min_days) }) : t("public.offer.oneDay")}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {TRADES.map((tr) => <Link key={tr.key} href={`?trade=${tr.key}`} className={tr.key === focus ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{fmt.trades(tr.key)}</Link>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {top.map((w) => (
            <div key={w.id} className="card flex gap-3 p-3">
              <Avatar w={w} size={64} />
              <div className="min-w-0">
                <div className="font-semibold">{displayName(w)}</div>
                <div className="text-xs text-muted">{fmt.trade(w.trade)} · {t("public.offer.years", { n: w.years })} · {fmt.country(w.country)}</div>
                <Rating value={st.get(w.id)!.rating} count={st.get(w.id)!.jobs} />
              </div>
            </div>
          ))}
        </div>
        <Link href={cta} className="btn-primary w-full py-3 text-base">{u?.role === "contractor" ? t("public.offer.ctaBook") : t("public.offer.ctaSignup")}</Link>
        <p className="text-center text-xs text-muted">{t("public.offer.foot")}</p>
      </main>
    </div>
  );
}

function OfferHeader({ logged, login }: { logged: boolean; login: string }) {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
        <Link href="/"><Logo dark /></Link>
        <div className="flex items-center gap-3"><LanguageSwitcher dark />{!logged && <Link href="/login" className="text-sm text-white/70">{login}</Link>}</div>
      </div>
    </header>
  );
}

/** Who is offering: reliability ring, license, name, about, regions. */
function AgencyHead({ a, score, t, fmt }: { a: Agency; score: number } & Pick<I18n, "t" | "fmt">) {
  return (
    <section className="flex flex-wrap items-center gap-5">
      <ScoreRing score={score} size={96} />
      <div className="flex-1">
        <div className="text-sm text-muted">{t("public.offer.licensed", { license: a.license_no })}{a.verified ? ` · ${t("public.offer.verified")}` : ""}</div>
        <h1 className="text-3xl font-bold">{a.name}</h1>
        <p className="text-muted">{a.about}</p>
        <div className="mt-1 text-sm text-muted">{t("public.offer.regions", { list: a.regions.split(",").map(fmt.region).join(" · ") })}</div>
      </div>
    </section>
  );
}
