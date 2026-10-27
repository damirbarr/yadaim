import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ICheck, IChart, IDoc, IInbox, IReceipt, IUpload, IWhatsapp } from "@/components/icons";
import { CrewCard, DimLine, OfferCard, SearchCard } from "@/components/landing/Visuals";
import { getI18n } from "@/lib/i18n/server";

const TRUST = ["t1", "t2", "t3"] as const;
const STATS = ["agencies", "workers", "lock", "noFit"] as const;
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
  return s.split(/([~₪]?\d[\d.,:]*(?:[–-]\d[\d.,:]*)?)/).map((part, i) => (i % 2 ? <span key={i} className="num">{part}</span> : part));
}

const WRAP = "mx-auto max-w-6xl px-4 md:px-6";
const H2 = "text-[30px] font-bold leading-[1.15] md:text-[40px]";

export default async function Landing() {
  const u = await currentUser();
  const { t, rich } = await getI18n();
  const outline = "btn border border-white/70 text-white hover:bg-white hover:text-ink";
  return (
    <div>
      {/* Hero: the promise, the two doors (contractor / agency) and the product itself. */}
      <section className="blueprint">
        <header className={`${WRAP} flex flex-wrap items-center gap-x-8 gap-y-3 py-5`}>
          <Logo dark />
          <nav className="hidden items-center gap-6 text-[15px] font-medium text-white/75 lg:flex">
            <a href="#contractors" className="hover:text-white">{t("public.landing.nav.contractors")}</a>
            <a href="#agencies" className="hover:text-white">{t("public.landing.nav.agencies")}</a>
            <a href="#pricing" className="hover:text-white">{t("public.landing.nav.pricing")}</a>
            <a href="#faq" className="hover:text-white">{t("public.landing.nav.faq")}</a>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher dark className="hidden sm:inline-flex" />
            {u ? (
              <Link href={homeFor(u.role)} className="btn-hazard btn-sm">{t("public.landing.myArea")}</Link>
            ) : (
              <>
                <Link href="/login" className={`${outline} btn-sm`}>{t("public.landing.login")}</Link>
                <Link href="/signup" className="btn-hazard btn-sm hidden sm:inline-flex">{t("public.landing.signup")}</Link>
              </>
            )}
          </div>
          <LanguageSwitcher dark className="w-full sm:hidden" />
        </header>

        <div className={`${WRAP} grid items-center gap-x-14 gap-y-12 pb-16 pt-8 md:pb-24 md:pt-14 lg:grid-cols-[minmax(0,1fr)_440px]`}>
          <div className="max-w-[620px]">
            <div className="flex items-center gap-3 text-[13px] font-semibold text-hazard">
              <DimLine className="w-8 shrink-0" />{t("public.landing.eyebrow")}
            </div>
            <h1 className="mt-5 text-[38px] font-bold leading-[1.08] text-white sm:text-[48px] lg:text-[56px]">
              <span className="block text-balance">{t("public.landing.h1a")}</span>
              <span className="block text-balance text-hazard">{t("public.landing.h1b")}</span>
            </h1>
            <p className="mt-6 max-w-[56ch] text-[17px] leading-relaxed text-[#c9d6e3] md:text-[19px]">{t("public.landing.lead")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?role=contractor" className="btn-hazard px-6 py-3.5 text-[16px]">{t("public.landing.ctaContractor")}</Link>
              <Link href="/signup?role=agency" className={`${outline} px-6 py-3.5 text-[16px]`}>{t("public.landing.ctaAgency")}</Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/80">
              {TRUST.map((k) => (
                <li key={k} className="flex items-center gap-2"><ICheck className="h-4 w-4 text-hazard" />{t(`public.landing.trust.${k}`)}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center lg:justify-end">
            <CrewCard />
          </div>
        </div>
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
                <li key={k} className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 border-b border-dashed border-line py-5">
                  <span className="num grid h-9 w-9 place-items-center rounded-[3px] border border-ink text-[15px] font-bold text-ink">{i + 1}</span>
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
                <span className="grid h-10 w-10 place-items-center rounded-[3px] bg-ink text-hazard"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-[18px] font-bold leading-snug text-ink">{t(`public.landing.agencies.items.${k}.t`)}</h3>
                <p className="mt-1.5 max-w-[46ch] text-[15px] leading-relaxed text-muted">{t(`public.landing.agencies.items.${k}.d`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facts: the market and the two promises, in numbers. */}
      <section className="blueprint">
        <div className={WRAP}>
          <div className="-mx-4 grid grid-cols-2 md:-mx-6 lg:grid-cols-4">
            {STATS.map((k, i) => (
              <div key={k} className={`border-white/15 px-4 py-8 md:px-6 md:py-10 ${i % 2 === 0 ? "border-e" : ""} ${i === 1 ? "lg:border-e" : ""} ${i < 2 ? "border-b lg:border-b-0" : ""}`}>
                <div className={`text-[30px] font-bold leading-none md:text-[40px] ${i === 3 ? "text-hazard" : "text-white"}`}>{figure(t(`public.landing.stats.${k}.n`))}</div>
                <div className="mt-3 text-[15px] font-semibold text-white">{t(`public.landing.stats.${k}.label`)}</div>
                <div className="mt-0.5 text-[13px] text-white/55">{t(`public.landing.stats.${k}.note`)}</div>
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
              <div key={side} className="flex flex-col rounded-[3px] border border-line border-t-[3px] border-t-ink bg-white p-6 md:p-8">
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
              <details key={k} className="group border-b border-dashed border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {t(`public.landing.faq.${k}.q`)}
                  <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-[3px] border border-line text-[18px] leading-none text-ink transition group-open:rotate-45 group-open:border-ink">+</span>
                </summary>
                <p className="max-w-[65ch] pb-5 text-[15px] leading-relaxed text-muted">{t(`public.landing.faq.${k}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing band: the same two doors as the hero, plus the demo. */}
      <section className="blueprint">
        <div className={`${WRAP} flex flex-col gap-8 py-14 md:py-20 lg:flex-row lg:items-end lg:justify-between`}>
          <div className="max-w-[620px]">
            <DimLine className="w-16" />
            <h2 className={`mt-5 text-white ${H2}`}>{t("public.landing.final.title")}</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-[#c9d6e3] md:text-[17px]">{t("public.landing.final.text")}</p>
          </div>
          <div className="shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?role=contractor" className="btn-hazard px-6 py-3.5 text-[16px]">{t("public.landing.ctaContractor")}</Link>
              <Link href="/signup?role=agency" className={`${outline} px-6 py-3.5 text-[16px]`}>{t("public.landing.ctaAgency")}</Link>
            </div>
            <p className="mt-4 text-[14px] text-white/60">{rich("public.landing.demo", { link: (c) => <Link href="/login" className="font-semibold text-white underline underline-offset-4">{c}</Link> })}</p>
          </div>
        </div>
      </section>

      <footer className="bg-ink text-white">
        <div className={`${WRAP} flex flex-col gap-5 border-t border-white/15 py-8 text-[13px] text-white/60 md:flex-row md:items-center md:justify-between`}>
          <Logo dark className="text-[22px]" />
          <span className="max-w-[60ch]">{t("public.landing.footer")}</span>
          <LanguageSwitcher dark />
        </div>
      </footer>
    </div>
  );
}
