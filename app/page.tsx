import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { IArrow, IBuilding, ICalendar, ICheck, IChart, IClock, IDoc, IHelmet, IInbox, IMenu, IPin, IReceipt, IShield, IUpload, IUser, IUsers, IWhatsapp } from "@/components/icons";
import { DateField } from "@/components/DateField";
import { REGIONS, TRADES, nextWorkday, todayISO } from "@/lib/domain";
import { OfferCard, SearchCard } from "@/components/landing/Visuals";
import { getI18n } from "@/lib/i18n/server";

const STATS = [{ k: "agencies", Icon: IBuilding }, { k: "workers", Icon: IUsers }, { k: "lock", Icon: IClock }, { k: "noFit", Icon: IShield }] as const;
const VALUES = [{ k: "v1", Icon: IShield }, { k: "v2", Icon: IUsers }, { k: "v3", Icon: IClock }, { k: "v4", Icon: IReceipt }] as const;
const STEPS_C = ["s1", "s2", "s3", "s4", "s5"] as const;
const FOR_AGENCY = [
  { k: "i1", Icon: IUpload }, { k: "i2", Icon: IDoc }, { k: "i3", Icon: IWhatsapp },
  { k: "i4", Icon: IInbox }, { k: "i5", Icon: IChart }, { k: "i6", Icon: IReceipt },
] as const;
const PAY = ["p1", "p2", "p3"] as const;
const FAQ = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

// One width and gutter for every section, so edges line up down the page.
// A figure like "75–80k" mixes digits and words: only the digit range is isolated as LTR (so RTL doesn't flip it
// to "80–75"), while the words keep the paragraph's direction.
function figure(s: string) {
  return s.split(/([~₪]?\d[\d.,:]*(?:[–-]\d[\d.,:]*)?)/).map((part, i) => (i % 2 ? <span key={i} className="num" dir={/[–-]/.test(part) ? "ltr" : undefined}>{part}</span> : part));
}

const WRAP = "mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12";
const H2 = "text-[26px] font-extrabold leading-[1.2] md:text-[34px]";

export default async function Landing() {
  const u = await currentUser();
  const { t, rich, fmt } = await getI18n();
  return (
    <div>
      {/* Header: logo at the start, section links in the middle, sign-in and the main action at the end. */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className={`${WRAP} flex h-16 items-center gap-6 md:h-20`}>
          <Link href="/" aria-label={t("common.brand")}><Logo /></Link>
          <nav className="hidden flex-1 items-center justify-center gap-7 text-[15px] font-semibold text-ink lg:flex">
            <a href="#contractors" className="hover:text-ink-2 hover:underline underline-offset-8">{t("public.landing.top.how")}</a>
            <a href="#for-contractors" className="hover:underline underline-offset-8">{t("public.landing.nav.contractors")}</a>
            <a href="#for-agencies" className="hover:underline underline-offset-8">{t("public.landing.nav.agencies")}</a>
            <a href="#faq" className="hover:underline underline-offset-8">{t("public.landing.nav.faq")}</a>
          </nav>
          <div className="ms-auto flex items-center gap-2 lg:ms-0">
            <LanguageSwitcher className="hidden xl:inline-flex" />
            {u ? (
              <Link href={homeFor(u.role)} className="btn-hazard">{t("public.landing.myArea")}</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost"><IUser className="h-5 w-5" />{t("public.landing.login")}</Link>
                <Link href="/login?mode=signup" className="btn-hazard hidden sm:inline-flex">{t("public.landing.top.startFree")}</Link>
              </>
            )}
            <details className="relative lg:hidden">
              <summary aria-label={t("public.landing.top.menu")} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-[10px] text-ink hover:bg-cool [&::-webkit-details-marker]:hidden"><IMenu className="h-6 w-6" /></summary>
              <div className="card absolute end-0 top-12 z-40 grid w-60 gap-1 p-2 text-[15px] font-semibold">
                <a href="#contractors" className="rounded-[8px] px-3 py-2.5 hover:bg-cool">{t("public.landing.top.how")}</a>
                <a href="#for-contractors" className="rounded-[8px] px-3 py-2.5 hover:bg-cool">{t("public.landing.nav.contractors")}</a>
                <a href="#for-agencies" className="rounded-[8px] px-3 py-2.5 hover:bg-cool">{t("public.landing.nav.agencies")}</a>
                <a href="#faq" className="rounded-[8px] px-3 py-2.5 hover:bg-cool">{t("public.landing.nav.faq")}</a>
                {!u && <Link href="/login?mode=signup" className="btn-hazard mt-1 sm:hidden">{t("public.landing.top.startFree")}</Link>}
                <LanguageSwitcher className="mt-1 justify-center" />
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Hero: light sky, the worker at the end side, the building site at the start side, the promise in the middle.
          The worker photo is never faded or masked over the face (design system §2); only the site photo blends in. */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fb_55%,#f7f6f2_100%)]">
        <img src="/brand/hero-site.webp" alt={t("public.landing.top.siteAlt")} className="pointer-events-none absolute bottom-0 start-0 hidden h-[94%] w-auto max-w-[30%] object-cover object-left opacity-95 [mask-image:linear-gradient(to_right,#000_55%,transparent)] rtl:[mask-image:linear-gradient(to_left,#000_55%,transparent)] lg:block" />
        <img src="/brand/hero-worker.webp" alt={t("public.landing.top.workerAlt")} className="pointer-events-none absolute bottom-0 end-0 hidden h-[96%] w-auto max-w-[32%] object-contain object-bottom lg:block ltr:-scale-x-100" />
        {/* Phone: both pictures as one band above the text */}
        <div className="relative h-44 lg:hidden">
          <img src="/brand/hero-site.webp" alt="" className="absolute inset-y-0 start-0 h-full w-1/2 object-cover [mask-image:linear-gradient(to_right,#000_50%,transparent)] rtl:[mask-image:linear-gradient(to_left,#000_50%,transparent)]" />
          <img src="/brand/hero-worker.webp" alt={t("public.landing.top.workerAlt")} className="absolute bottom-0 end-0 h-full w-auto ltr:-scale-x-100" />
        </div>
        <div className={`${WRAP} relative pb-28 pt-6 text-center lg:pb-36 lg:pt-16`}>
          <div className="mx-auto max-w-[760px]">
            <div className="eyebrow">{t("public.landing.eyebrow")}</div>
            <h1 className="mt-3 text-[32px] font-black leading-[1.2] text-ink sm:text-[40px] lg:text-[clamp(42px,4.1vw,60px)] lg:leading-[1.15]">
              <span className="block text-balance">{t("public.landing.top.h1a")}</span>
              <span className="block text-balance">{rich("public.landing.top.h1b", { mark: (c) => <span className="relative whitespace-nowrap">{c}<svg viewBox="0 0 200 14" preserveAspectRatio="none" className="absolute -bottom-2 start-0 h-3 w-full" aria-hidden><path d="M3 9c38-6 80-7 120-4 26 2 48 3 74-2" fill="none" stroke="#d4f25a" strokeWidth="7" strokeLinecap="round" /></svg></span> })}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[62ch] text-[16px] leading-relaxed text-muted md:text-[18px]">{t("public.landing.top.lead")}</p>
            <div className="mx-auto mt-8 grid max-w-[640px] gap-3 sm:grid-cols-2">
              <Link href="/signup?role=contractor" className="group flex min-h-16 items-center gap-4 rounded-[12px] bg-ink px-5 py-3 text-start text-white shadow-[0_14px_36px_rgba(14,42,68,0.18)] hover:bg-ink-2">
                <IHelmet className="h-8 w-8 shrink-0 text-hazard" />
                <span className="flex-1"><span className="block text-[20px] font-extrabold leading-tight">{t("public.landing.top.contractor.t")}</span><span className="block text-[14px] text-white/80">{t("public.landing.top.contractor.d")}</span></span>
                <IArrow className="flip-ltr h-5 w-5 shrink-0 text-hazard transition group-hover:-translate-x-1" />
              </Link>
              <Link href="/signup?role=agency" className="group flex min-h-16 items-center gap-4 rounded-[12px] border border-ink bg-white px-5 py-3 text-start text-ink hover:bg-cool">
                <IUsers className="h-8 w-8 shrink-0" />
                <span className="flex-1"><span className="block text-[20px] font-extrabold leading-tight">{t("public.landing.top.agency.t")}</span><span className="block text-[14px] text-muted">{t("public.landing.top.agency.d")}</span></span>
                <IArrow className="flip-ltr h-5 w-5 shrink-0 transition group-hover:-translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Facts strip, floating over the hero's lower edge between two hazard stripes. Market figures come from the brief
          and must be verified before launch (design system §4). */}
      <div className="relative -mt-16 lg:-mt-20">
        <div aria-hidden className="absolute inset-x-0 top-1/2 hidden h-7 -translate-y-1/2 bg-[repeating-linear-gradient(-45deg,#d4f25a_0_14px,transparent_14px_28px)] md:block" />
        <div className={`${WRAP} relative`}>
          <ul className="card grid grid-cols-2 p-2 shadow-[0_14px_36px_rgba(14,42,68,0.10)] lg:grid-cols-4">
            {STATS.map(({ k, Icon }) => (
              <li key={k} className="flex items-center gap-3 border-line px-4 py-4 md:justify-center lg:[&:not(:first-child)]:border-s">
                <Icon className="h-9 w-9 shrink-0 text-ink" />
                <span><span className="block text-[24px] font-extrabold leading-none text-ink md:text-[28px]">{figure(t(`public.landing.stats.${k}.n`))}</span><span className="mt-1 block text-[13px] text-muted md:text-[14px]">{t(`public.landing.stats.${k}.label`)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Contractor search: real controls into the real search (signing in on the way when needed). */}
      <section className={`${WRAP} mt-10`}>
        <form action="/c/search" aria-label={t("public.landing.top.search.title")} className="card grid items-end gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:p-5">
          <div>
            <label className="label flex items-center gap-1.5" htmlFor="ls-trade"><IHelmet className="h-4 w-4" />{t("public.landing.top.search.trade")}</label>
            <select id="ls-trade" name="trade" className="input" defaultValue="formwork">{TRADES.map((tr) => <option key={tr.key} value={tr.key}>{fmt.trade(tr.key)}</option>)}</select>
          </div>
          <div>
            <label className="label flex items-center gap-1.5" htmlFor="ls-city"><IPin className="h-4 w-4" />{t("public.landing.top.search.place")}</label>
            <select id="ls-city" name="city" className="input" defaultValue={REGIONS[1].cities[0]}>
              {REGIONS.map((rg) => <optgroup key={rg.key} label={fmt.region(rg.key)}>{rg.cities.map((c) => <option key={c} value={c}>{fmt.city(c)}</option>)}</optgroup>)}
            </select>
          </div>
          <div>
            <span className="label flex items-center gap-1.5"><ICalendar className="h-4 w-4" />{t("public.landing.top.search.date")}</span>
            <DateField name="date" min={todayISO()} defaultValue={nextWorkday(todayISO())} withDay />
          </div>
          <button className="btn-hazard min-h-12 w-full px-6 text-[16px] md:w-auto"><span>{t("public.landing.top.search.submit")}</span></button>
        </form>
      </section>

      {/* Four promises, one line each */}
      <section className={`${WRAP} mt-12`}>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {VALUES.map(({ k, Icon }) => (
            <li key={k} className="flex flex-col items-center gap-2 text-center md:flex-row md:items-start md:text-start">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-cool text-ink"><Icon className="h-6 w-6" /></span>
              <span><span className="block text-[16px] font-bold text-ink">{t(`public.landing.top.values.${k}.t`)}</span><span className="block text-[14px] text-muted">{t(`public.landing.top.values.${k}.d`)}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {/* The two doors again, with what each side gets */}
      <section className={`${WRAP} mt-14 grid gap-5 md:grid-cols-2`}>
        {([["forC", "for-contractors", "#contractors", IHelmet], ["forA", "for-agencies", "#agencies", IBuilding]] as const).map(([k, id, href, Icon]) => (
          <article key={k} id={id} className="card relative scroll-mt-24 overflow-hidden p-6 md:p-8">
            <Icon aria-hidden className="pointer-events-none absolute -bottom-6 end-4 h-40 w-40 text-cool" />
            <div className="relative">
              <div className="eyebrow">{t(`public.landing.top.${k}.eyebrow`)}</div>
              <h2 className="mt-1.5 text-[24px] font-extrabold leading-tight text-ink md:text-[28px]">{t(`public.landing.top.${k}.title`)}</h2>
              <p className="mt-2 max-w-[46ch] text-[15px] text-muted">{t(`public.landing.top.${k}.text`)}</p>
              <ul className="mt-4 space-y-2 text-[15px] text-ink">
                {(["b1", "b2", "b3"] as const).map((b) => <li key={b} className="flex items-center gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hazard text-ink"><ICheck className="h-3.5 w-3.5" /></span>{t(`public.landing.top.${k}.${b}`)}</li>)}
              </ul>
              <a href={href} className="mt-5 inline-flex items-center gap-2 text-[16px] font-bold text-ink hover:underline underline-offset-4">{t(`public.landing.top.${k}.cta`)}<IArrow className="flip-ltr h-4 w-4" /></a>
            </div>
          </article>
        ))}
      </section>

      {/* Contractors: five steps beside the real search screen. The picture keeps its own size and sticks while the steps scroll. */}
      <section id="contractors" className="scroll-mt-4 py-16 md:py-24">
        <div className={WRAP}>
          <div className="max-w-[640px]">
            <div className="eyebrow">{t("public.landing.contractors.eyebrow")}</div>
            <h2 className={`mt-2 text-ink ${H2}`}>{t("public.landing.contractors.title")}</h2>
            <p className="mt-3 text-[17px] text-muted">{t("public.landing.contractors.lead")}</p>
          </div>
          <div className="mt-10 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
            <ol className="border-t border-ink/15">
              {STEPS_C.map((k, i) => (
                <li key={k} className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 border-b border-line py-5">
                  <span className="num grid h-9 w-9 place-items-center rounded-[10px] border border-ink text-[15px] font-bold text-ink">{i + 1}</span>
                  <div className="max-w-[62ch]">
                    <h3 className="text-[18px] font-bold leading-snug text-ink md:text-[19px]">{t(`public.landing.contractors.steps.${k}.t`)}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted">{t(`public.landing.contractors.steps.${k}.d`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex justify-center self-start lg:sticky lg:top-8">
              <SearchCard />
            </div>
          </div>
        </div>
      </section>

      {/* Agencies: the offer the system drafts for idle days, then six capabilities that each read at a glance. */}
      <section id="agencies" className="scroll-mt-4 border-y border-line bg-white py-16 md:py-24">
        <div className={WRAP}>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
            <div className="max-w-[640px]">
              <div className="eyebrow">{t("public.landing.agencies.eyebrow")}</div>
              <h2 className={`mt-2 text-ink ${H2}`}>{t("public.landing.agencies.title")}</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-muted">{t("public.landing.agencies.lead")}</p>
              <Link href="/signup?role=agency" className="btn-primary mt-7 px-5 py-3">{t("public.landing.ctaAgency")}</Link>
            </div>
            <div className="flex justify-center self-center lg:justify-end">
              <OfferCard />
            </div>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {FOR_AGENCY.map(({ k, Icon }) => (
              <div key={k} className="border-t border-ink/15 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-ink text-hazard"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-[18px] font-bold leading-snug text-ink">{t(`public.landing.agencies.items.${k}.t`)}</h3>
                <p className="mt-1.5 max-w-[46ch] text-[15px] leading-relaxed text-muted">{t(`public.landing.agencies.items.${k}.d`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment: who pays whom. The platform's fee amount is deliberately not shown here. */}
      <section id="pricing" className="scroll-mt-4 py-16 md:py-24">
        <div className={WRAP}>
          <div className="max-w-[640px]">
            <div className="eyebrow">{t("public.landing.pricing.eyebrow")}</div>
            <h2 className={`mt-2 text-ink ${H2}`}>{t("public.landing.pricing.title")}</h2>
            <p className="mt-3 text-[17px] text-muted">{t("public.landing.pricing.lead")}</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {(["contractor", "agency"] as const).map((side) => (
              <div key={side} className="flex flex-col rounded-[10px] border border-line border-t-[3px] border-t-ink bg-white p-6 md:p-8">
                <div className="eyebrow">{t(`public.landing.pricing.${side}.eyebrow`)}</div>
                <h3 className="mt-1.5 text-[24px] font-bold leading-tight text-ink">{t(`public.landing.pricing.${side}.title`)}</h3>
                <ul className="mt-5 flex-1 space-y-3 text-[15px] text-text">
                  {PAY.map((p) => (
                    <li key={p} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"><ICheck className="h-3 w-3" /></span>{t(`public.landing.pricing.${side}.${p}`)}</li>
                  ))}
                </ul>
                <Link href={`/login?intent=${side}`} className={`${side === "contractor" ? "btn-primary" : "btn-ghost"} mt-7 self-start`}>{t(`public.landing.pricing.${side}.cta`)}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-4 border-t border-line pb-16 pt-16 md:pb-24 md:pt-20">
        <div className={`${WRAP} grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16`}>
          <div>
            <h2 className={`text-ink ${H2}`}>{t("public.landing.faq.title")}</h2>
            <p className="mt-3 max-w-[40ch] text-[16px] text-muted">{t("public.landing.faq.lead")}</p>
          </div>
          <div className="border-t border-ink/15">
            {FAQ.map((k) => (
              <details key={k} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {t(`public.landing.faq.${k}.q`)}
                  <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border border-line text-[18px] leading-none text-ink transition group-open:rotate-45 group-open:border-ink">+</span>
                </summary>
                <p className="max-w-[65ch] pb-5 text-[15px] leading-relaxed text-muted">{t(`public.landing.faq.${k}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing card: the same two doors as the hero, plus the demo. Light, like the hero. */}
      <section className={`${WRAP} pb-16 md:pb-24`}>
        <div className="card flex flex-col gap-8 bg-[linear-gradient(180deg,#ffffff,#f4f8fb)] p-6 md:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[620px]">
            <h2 className={`text-ink ${H2}`}>{t("public.landing.final.title")}</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-muted md:text-[17px]">{t("public.landing.final.text")}</p>
          </div>
          <div className="shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?role=contractor" className="btn-primary px-6 py-3.5 text-[16px]">{t("public.landing.ctaContractor")}</Link>
              <Link href="/signup?role=agency" className="btn-ghost px-6 py-3.5 text-[16px]">{t("public.landing.ctaAgency")}</Link>
            </div>
            <p className="mt-4 text-[14px] text-muted">{rich("public.landing.demo", { link: (c) => <Link href="/login" className="font-semibold text-ink underline underline-offset-4">{c}</Link> })}</p>
          </div>
        </div>
      </section>

      <footer className="bg-ink-deep text-white">
        <div className={`${WRAP} flex flex-col gap-5 border-t border-white/15 py-8 text-[13px] text-white/60 md:flex-row md:items-center md:justify-between`}>
          <Logo dark className="text-[22px]" />
          <span className="max-w-[60ch]">{t("public.landing.footer")}</span>
          <span className="flex gap-3"><Link href="/privacy" className="underline hover:text-white">{t("public.legal.privacy")}</Link><Link href="/terms" className="underline hover:text-white">{t("public.legal.terms")}</Link></span>
          <LanguageSwitcher dark />
        </div>
      </footer>
    </div>
  );
}
