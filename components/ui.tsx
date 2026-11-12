"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { BY, CN, GE, IN, KE, LK, MD, MW, RO, TH, UZ, type FlagComponent } from "country-flag-icons/react/3x2";
import { useI18n } from "@/lib/i18n/client";

/**
 * The brand mark from the owner's handoff: a framed square with corner ticks, a lime hard hat held by two hands,
 * and the name with a lime dashed stripe under it. Drawn here as SVG (the handoff only had a screenshot crop).
 * `dark` = on a navy background.
 */
export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const { t } = useI18n();
  const c = dark ? "#ffffff" : "#0e2a44";
  return (
    <span className={`inline-flex items-center gap-2.5 leading-none ${dark ? "text-white" : "text-ink"} ${className}`}>
      <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0" aria-hidden>
        <rect x="4" y="4" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" />
        <path d="M1 4h6M4 1v6M41 4h6M44 1v6M1 44h6M4 41v6M41 44h6M44 41v6" stroke={c} strokeWidth="1.4" />
        {/* hard hat */}
        <path d="M14 23.5a10 10 0 0 1 20 0z" fill="#d4f25a" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M24 13.5v10M20.5 15.2l1.2 8.3M27.5 15.2l-1.2 8.3" stroke={c} strokeWidth="1.1" />
        <rect x="11.5" y="23.2" width="25" height="3" rx="1.5" fill="#d4f25a" stroke={c} strokeWidth="1.4" />
        {/* two hands holding it */}
        <path d="M10 22c-1.6 0-2.4 1.3-2.4 3v6.5c0 2.6 1.5 4.6 3.6 5.8l4.3 2.4v2.3h7.3v-4.1c0-2.4-1-4.3-2.8-5.6l-4.1-3v-3.3c0-1-.8-1.8-1.8-1.8s-1.8.8-1.8 1.8v1.8l-.5-.4V24c0-1.2-.7-2-1.8-2z" fill={c} />
        <path d="M38 22c1.6 0 2.4 1.3 2.4 3v6.5c0 2.6-1.5 4.6-3.6 5.8l-4.3 2.4v2.3h-7.3v-4.1c0-2.4 1-4.3 2.8-5.6l4.1-3v-3.3c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v1.8l.5-.4V24c0-1.2.7-2 1.8-2z" fill={c} />
      </svg>
      <span className="inline-flex flex-col items-stretch gap-[5px]">
        <span className="font-display text-[30px] font-black tracking-[-0.02em]">{t("common.brand")}</span>
        <svg viewBox="0 0 80 5" preserveAspectRatio="none" className="h-[5px] w-full" aria-hidden>
          <path d="M0 5L3 0h10l-3 5zM16 5l3-5h10l-3 5zM32 5l3-5h10l-3 5z" fill="#d4f25a" />
          <rect x="48" y="0" width="32" height="5" fill={c} />
        </svg>
      </span>
    </span>
  );
}

const HELMET: Record<string, string> = { formwork: "#d4f25a", rebar: "#ff7a45", plaster: "#ffffff", tiling: "#7fb2e5", masonry: "#f2c14e" };
const SKIN = ["#f0d7bf", "#b9865f", "#ebcda8", "#c99a72", "#e3bf9c", "#8d5a3b"];
const SHIRT = ["#0e2a44", "#4a5a66", "#7c4a2e", "#2e6b3f", "#163a5c", "#5b4636"];

// Flags of the countries in COUNTRIES (lib/domain.ts). Imported one by one so only these reach the browser;
// a new country needs its flag added here too.
const FLAGS: Record<string, FlagComponent> = { IN, LK, MD, UZ, CN, BY, GE, RO, TH, KE, MW };

/** Country flag with the country's name as a tooltip (and for screen readers), in the viewer's language. */
export function Flag({ code, width = 18, className = "" }: { code: string | null | undefined; width?: number; className?: string }) {
  const { fmt } = useI18n();
  const F = code ? FLAGS[code] : undefined;
  if (!F) return null;
  const name = fmt.country(code!);
  return (
    // Positioned either way (the tooltip needs it): relative by default, or whatever position the caller passes.
    <span role="img" aria-label={name} className={`group/flag inline-flex ${/\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative"} ${className}`}>
      <F aria-hidden className="block rounded-[6px] shadow-[0_0_0_1px_rgba(14,42,68,.25)]" style={{ width, height: (width * 2) / 3 }} />
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-ink px-2 py-1 text-[12px] font-semibold leading-none text-white opacity-0 transition-opacity group-hover/flag:opacity-100">
        {name}
      </span>
    </span>
  );
}

/** Worker avatar: uploaded photo if present, otherwise a line-drawn figure with a helmet in the trade's colour.
 *  When the worker's country is known, its flag sits on the bottom corner (tooltip: the country's name). */
export function Avatar({ w, size = 48, className = "" }: { w: { worker_id?: number; id?: number; photo?: string | null; trade: string; first_name?: string; country?: string | null }; size?: number; className?: string }) {
  const id = w.worker_id ?? w.id ?? 0;
  const face = w.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/files/${w.photo}`} alt={w.first_name ?? ""} width={size} height={size} className="h-full w-full rounded-[inherit] border-[1.5px] border-ink object-cover" />
  ) : (
    <svg viewBox="0 0 48 48" className="h-full w-full rounded-[inherit] border-[1.5px] border-ink" style={{ background: "#e9e1d0" }} aria-hidden>
      <circle cx="24" cy="26" r="9" fill={SKIN[id % SKIN.length]} />
      <path d="M8 48c1-9 7-13 16-13s15 4 16 13z" fill={SHIRT[id % SHIRT.length]} />
      <path d="M13 23a11 11 0 0 1 22 0z" fill={HELMET[w.trade] ?? "#d4f25a"} stroke="#0e2a44" strokeWidth=".8" />
      <rect x="11" y="22" width="26" height="2.6" rx="1.3" fill={HELMET[w.trade] ?? "#d4f25a"} stroke="#0e2a44" strokeWidth=".8" />
    </svg>
  );
  return (
    // The frame owns size, shape and any ring passed in; the face fills it, so callers' classes keep working.
    <span className={`relative inline-flex shrink-0 rounded-full ${className}`} style={{ width: size, height: size }}>
      {face}
      {/* z-10: in overlapping stacks of avatars the next face would otherwise cover this flag */}
      <Flag code={w.country} width={Math.max(12, Math.round(size * 0.4))} className="absolute -bottom-0.5 -end-1 z-10" />
    </span>
  );
}

export function Rating({ value, count, size = "sm" }: { value: number | null; count?: number; size?: "sm" | "lg" }) {
  const { t } = useI18n();
  if (value == null) return <span className="chip-info">{t("common.newWorker")}</span>;
  return (
    <span className={`inline-flex items-center gap-1 ${size === "lg" ? "text-base" : "text-[13px]"}`}>
      <svg viewBox="0 0 20 20" className={size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"} fill="#0e2a44" aria-hidden>
        <path d="m10 1.5 2.6 5.5 6 .7-4.4 4.1 1.2 5.9L10 14.8l-5.4 2.9 1.2-5.9L1.4 7.7l6-.7z" />
      </svg>
      <b className="num">{value.toFixed(1)}</b>
      {count != null && <span className="text-muted">({t("common.jobs", { n: count })})</span>}
    </span>
  );
}

export function TradeChip({ k }: { k: string }) {
  const { fmt } = useI18n();
  return <span className="chip-muted">{fmt.trade(k)}</span>;
}

/** Page title in the "drawing sheet" style: small spaced eyebrow, serif title, muted subtitle. */
export function PageHead({ title, sub, children, back, eyebrow }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; back?: string; eyebrow?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-block text-[13px] font-semibold text-muted hover:text-ink">
            <span className="inline-block flip-ltr">→</span> {t("common.back")}
          </Link>
        )}
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-3xl text-[15px] text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Figure on a sheet: label, big serif number, note. tone "hazard" = the navy highlighted sheet. */
export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "hazard" | "ok" | "bad" }) {
  const dark = tone === "hazard";
  return (
    <div className={`sheet h-full p-5 ${dark ? "border-hazard bg-hazard-soft" : ""}`}>
      <div className={`text-[13px] font-semibold text-muted`}>{label}</div>
      <div className={`mt-1 font-display text-[40px] font-bold leading-none ${dark ? "text-ink" : tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : "text-ink"}`}>{value}</div>
      {hint && <div className={`mt-2 text-[13px] text-muted`}>{hint}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="sheet grid place-items-center gap-3 px-6 py-14 text-center">
      <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-cool text-ink">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z" /></svg>
      </span>
      <div className="font-display text-xl font-bold text-ink">{title}</div>
      {children && <div className="max-w-md text-[15px] text-muted">{children}</div>}
    </div>
  );
}

export function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const r = 42, c = 2 * Math.PI * r;
  const color = score >= 90 ? "#2e6b3f" : score >= 75 ? "#0e2a44" : score >= 60 ? "#9a5a00" : "#b3261e";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={useI18n().t("common.score", { n: score })}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5ddcc" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 50 50)" />
      {[0, 90, 180, 270].map((a) => <line key={a} x1="50" y1="2" x2="50" y2="9" stroke="#0e2a44" strokeWidth="1.2" transform={`rotate(${a} 50 50)`} />)}
      <text x="50" y="60" textAnchor="middle" fontSize="30" fontWeight="700" fontFamily="Heebo" fill="#0e2a44">{score}</text>
    </svg>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const cls = { info: "border-info bg-info-soft text-info", warn: "border-warn bg-warn-soft text-warn", bad: "border-bad bg-bad-soft text-bad", ok: "border-ok bg-ok-soft text-ok" }[tone];
  return <div className={`rounded-[10px] border-s-4 px-4 py-3 text-[15px] ${cls}`}>{children}</div>;
}
