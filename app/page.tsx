import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { Avatar, Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

const STATS = ["agencies", "workers", "lock", "noFit"] as const;
const STEPS_C = ["s1", "s2", "s3", "s4", "s5"] as const;
const FOR_AGENCY = ["i1", "i2", "i3", "i4", "i5", "i6"] as const;
const FAQ = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;
const DOCS = ["visa", "insurance", "safety", "heights"] as const;

export default async function Landing() {
  const u = await currentUser();
  const { t, rich, fmt } = await getI18n();
  const marks = t("public.landing.agencies.marks").split(" ");
  const crew = [
    { id: 3, n: t("public.landing.names.sergei"), tk: "formwork", c: "MD", y: 14, r: 4.9 },
    { id: 8, n: t("public.landing.names.rajesh"), tk: "formwork", c: "IN", y: 9, r: 4.8 },
    { id: 20, n: t("public.landing.names.mikhail"), tk: "rebar", c: "BY", y: 11, r: 4.7 },
  ];
  const picks = [
    { id: 3, n: t("public.landing.names.sergei"), c: "MD", y: 14, r: 4.9, p: 657, on: true },
    { id: 8, n: t("public.landing.names.rajesh"), c: "IN", y: 9, r: 4.8, p: 639, on: true },
    { id: 13, n: t("public.landing.names.wang"), c: "CN", y: 12, r: 4.7, p: 666, on: false },
  ];
  return (
    <div>
      <section className="blueprint">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 md:px-6">
          <Logo dark />
          <nav className="hidden items-center gap-6 text-[15px] font-semibold text-white/80 md:flex">
            <a href="#contractors" className="hover:text-white">{t("public.landing.nav.contractors")}</a>
            <a href="#agencies" className="hover:text-white">{t("public.landing.nav.agencies")}</a>
            <a href="#pricing" className="hover:text-white">{t("public.landing.nav.pricing")}</a>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher dark className="hidden sm:inline-flex" />
            {u ? <Link href={homeFor(u.role)} className="btn-hazard btn-sm">{t("public.landing.myArea")}</Link> : <><Link href="/login" className="btn btn-sm border-[1.5px] border-white text-white hover:bg-white hover:text-ink">{t("public.landing.login")}</Link><Link href="/signup" className="btn-hazard btn-sm hidden sm:inline-flex">{t("public.landing.signup")}</Link></>}
          </div>
          <LanguageSwitcher dark className="w-full justify-center sm:hidden" />
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-6 md:grid-cols-[1.05fr_.95fr] md:px-6 md:pb-20 md:pt-10">
          <div>
            <div className="text-[13px] font-bold text-hazard">{t("public.landing.eyebrow")}</div>
            <h1 className="mt-4 text-[44px] font-bold leading-[1.05] text-white md:text-[72px]">
              {t("public.landing.h1a")}<br /><em className="not-italic text-hazard">{t("public.landing.h1b")}</em>
            </h1>
            <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-[#c9d6e3] md:text-[20px]">{t("public.landing.lead")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup?role=contractor" className="btn-hazard px-6 py-3.5 text-[17px]">{t("public.landing.ctaContractor")}</Link>
              <Link href="/signup?role=agency" className="btn border-[1.5px] border-white px-6 py-3.5 text-[17px] text-white hover:bg-white hover:text-ink">{t("public.landing.ctaAgency")}</Link>
            </div>
            <p className="mt-4 text-[14px] text-white/60">{rich("public.landing.demo", { link: (c) => <Link href="/login" className="font-bold text-white underline underline-offset-4">{c}</Link> })}</p>
          </div>

          {/* The hero shows the product promise itself: tomorrow's crew, named and priced, the evening before. */}
          <div className="relative mx-auto w-full max-w-[460px] pb-6">
            <div className="rounded-[3px] bg-white text-ink">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <div className="text-[13px] text-muted">{t("public.landing.hero.where")}</div>
                  <div className="font-display text-[22px] font-bold">{t("public.landing.hero.title")}</div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 bg-ink px-2.5 py-1 text-[13px] font-semibold text-white"><span className="h-2 w-2 rounded-full bg-signal" />{t("public.landing.hero.locked")}</span>
              </div>
              {crew.map((w) => (
                <div key={w.id} className="mx-5 flex items-center gap-3 border-b border-dashed border-line py-3">
                  <Avatar w={{ id: w.id, trade: w.tk, country: w.c }} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold">{w.n} <span className="text-[13px] font-normal text-muted">· {fmt.trade(w.tk)} · {t("public.landing.hero.years", { n: w.y })}</span></div>
                    <div className="text-[12px] font-semibold text-ok">{DOCS.map((d) => `✓ ${fmt.docShort(d)}`).join(" · ")}</div>
                  </div>
                  <span className="num text-[14px] font-semibold">★ {fmt.num(w.r, 1)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 px-5 py-3 text-[13px] text-muted">
                <span>{t("public.landing.hero.pickup", { time: "06:15", driver: t("public.landing.names.driver") })}</span>
                <span>{t("public.landing.hero.included")}</span>
              </div>
              <div className="flex items-center justify-between bg-hazard px-5 py-3">
                <span className="text-[15px] font-semibold">{t("public.landing.hero.total")}</span>
                <span className="num font-display text-[24px] font-bold">{fmt.money(1962)}</span>
              </div>
            </div>
            <div className="absolute -bottom-1 start-6 flex items-center gap-2 border border-line bg-paper px-3 py-2 text-[13px] font-semibold text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ok text-[11px] text-white">✓</span>
              {t("public.landing.hero.arrived", { time: "07:02" })}
            </div>
          </div>
        </div>

        <div className="border-t border-white/20">
          <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
            {STATS.map((k, i) => (
              <div key={k} className={`border-white/20 px-4 py-5 md:px-6 ${i % 2 === 0 ? "border-e" : ""} ${i < 2 ? "border-b md:border-b-0" : ""} md:border-e md:last:border-e-0`}>
                <div className={`font-display text-[30px] font-bold leading-none md:text-[40px] ${i === 3 ? "text-hazard" : "text-white"}`}>{t(`public.landing.stats.${k}.n`)}</div>
                <div className="mt-1.5 text-[14px] font-semibold text-white">{t(`public.landing.stats.${k}.label`)}</div>
                <div className="text-[13px] text-white/55">{t(`public.landing.stats.${k}.note`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contractors" className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[400px_1fr] md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-[400px] rounded-[40px] bg-ink p-2.5 shadow-[0_30px_60px_-30px_rgba(14,42,68,.6)]">
          <div className="overflow-hidden rounded-[31px] bg-paper">
            <div className="border-b border-line px-5 pb-3 pt-5">
              <div className="text-[12px] text-muted">{t("public.landing.phone.where")}</div>
              <div className="font-display text-[30px] font-bold leading-tight text-ink">{t("public.landing.phone.available", { n: 11, trade: fmt.trade("formwork"), trades: fmt.trades("formwork") })}</div>
            </div>
            {picks.map((w) => (
              <div key={w.id} className="mx-4 grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-dashed border-line py-3.5">
                <Avatar w={{ id: w.id, trade: "formwork", country: w.c }} size={52} />
                <div><b className="text-[17px] text-ink">{w.n}</b> <span className="text-[12px] text-muted">· {t("public.landing.phone.years", { n: w.y })} · ★ {fmt.num(w.r, 1)}</span>
                  <div className="mt-1 flex gap-2 text-[12px] font-bold text-ok">{(["visa", "heights", "safety"] as const).map((d) => <span key={d}>✓ {fmt.docShort(d)}</span>)}</div></div>
                <div className="text-end"><div className="num font-display text-[22px] font-bold text-ink">{fmt.money(w.p)}</div>
                  <span className={`inline-block px-2.5 py-0.5 text-[12px] font-bold ${w.on ? "bg-ink text-white" : "border-[1.5px] border-ink text-ink"}`}>{w.on ? t("public.landing.phone.picked") : t("public.landing.phone.add")}</span></div>
              </div>
            ))}
            <div className="m-4 flex items-center justify-between gap-3 bg-ink px-4 py-3 text-[15px] text-white">
              <span>{rich("public.landing.phone.selected", { b: (c) => <b>{c}</b> }, { n: 2, trade: fmt.trade("formwork"), trades: fmt.trades("formwork"), price: fmt.money(1296) })}</span>
              <span className="bg-hazard px-4 py-1.5 font-bold text-ink">{t("public.landing.phone.next")}</span>
            </div>
          </div>
        </div>

        <div className="self-center">
          <div className="eyebrow">{t("public.landing.contractors.eyebrow")}</div>
          <h2 className="mt-2 text-[34px] font-bold leading-tight text-ink md:text-[48px]">{t("public.landing.contractors.title")}</h2>
          <ol className="mt-8 border-t border-ink/15">
            {STEPS_C.map((k, i) => (
              <li key={k} className="grid grid-cols-[56px_1fr] gap-4 border-b border-dashed border-line py-5">
                <span className="num font-display text-[34px] font-bold leading-none text-ink/30">{String(i + 1).padStart(2, "0")}</span>
                <div><h3 className="text-[20px] font-bold text-ink">{t(`public.landing.contractors.steps.${k}.t`)}</h3><p className="mt-1 text-[15px] text-muted">{t(`public.landing.contractors.steps.${k}.d`)}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="agencies" className="blueprint">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="text-[13px] font-bold text-hazard">{t("public.landing.agencies.eyebrow")}</div>
          <h2 className="mt-2 text-[34px] font-bold leading-tight text-white md:text-[48px]">{t("public.landing.agencies.title")}</h2>
          <p className="mt-3 max-w-2xl text-[17px] text-[#c9d6e3]">{t("public.landing.agencies.lead")}</p>
          <div className="mt-10 grid border-s border-t border-white/20 sm:grid-cols-2 lg:grid-cols-3">
            {FOR_AGENCY.map((k, i) => (
              <div key={k} className="relative border-b border-e border-white/20 p-6">
                <span className="absolute end-4 top-3 text-[11px] font-bold text-white/40">{marks[i]}</span>
                <h3 className="pe-6 text-[21px] font-bold text-white">{t(`public.landing.agencies.items.${k}.t`)}</h3>
                <p className="mt-2 text-[15px] text-white/70">{t(`public.landing.agencies.items.${k}.d`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="eyebrow">{t("public.landing.pricing.eyebrow")}</div>
        <h2 className="mt-2 text-[36px] font-bold text-ink md:text-[48px]">{t("public.landing.pricing.title")}</h2>
        <div className="mt-8 grid gap-0 border border-line bg-white md:grid-cols-2">
          <div className="border-b border-line p-7 md:border-b-0 md:border-e">
            <div className="eyebrow">{t("public.landing.pricing.contractor.eyebrow")}</div>
            <div className="mt-2 font-display text-[32px] font-bold text-ink">{t("public.landing.pricing.contractor.title")}</div>
            <p className="mt-2 text-[15px] text-muted">{t("public.landing.pricing.contractor.text")}</p>
            <Link href="/login?intent=contractor" className="btn-primary mt-6">{t("public.landing.pricing.contractor.cta")}</Link>
          </div>
          <div className="blueprint p-7">
            <div className="text-[12px] font-bold text-hazard">{t("public.landing.pricing.agency.eyebrow")}</div>
            <div className="mt-2 font-display text-[32px] font-bold text-white">{t("public.landing.pricing.agency.title")}</div>
            <ul className="mt-3 space-y-1.5 text-[15px] text-white/75">
              {(["p1", "p2", "p3"] as const).map((k) => <li key={k} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-hazard" />{t(`public.landing.pricing.agency.${k}`)}</li>)}
            </ul>
            <Link href="/login?intent=agency" className="btn-hazard mt-6">{t("public.landing.pricing.agency.cta")}</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <h2 className="mb-5 text-[30px] font-bold text-ink">{t("public.landing.faq.title")}</h2>
        <div className="border-t border-ink/15">
          {FAQ.map((k) => (
            <details key={k} className="group border-b border-dashed border-line py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[18px] font-bold text-ink">{t(`public.landing.faq.${k}.q`)}<span className="font-display text-[24px] font-normal text-muted transition group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-[15px] text-muted">{t(`public.landing.faq.${k}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="blueprint border-t-[3px] border-hazard">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-7 text-[14px] text-white/65 md:px-6">
          <Logo dark className="text-[22px]" />
          <span>{t("public.landing.footer")}</span>
          <LanguageSwitcher dark />
        </div>
      </footer>
    </div>
  );
}
