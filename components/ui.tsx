import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND, trade } from "@/lib/domain";

/** Square drafting-frame mark with a helmet, plus the name in serif. `dark` = on a navy background. */
export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const c = dark ? "#d4f25a" : "#0e2a44";
  return (
    <span className={`inline-flex items-center gap-2.5 font-display text-[26px] font-bold leading-none ${dark ? "text-white" : "text-ink"} ${className}`}>
      <svg viewBox="0 0 38 38" className="h-9 w-9" aria-hidden>
        <rect x="1" y="1" width="36" height="36" fill="none" stroke={c} strokeWidth="2" />
        <path d="M8 24a11 11 0 0 1 22 0v2H8z" fill={c} />
        <path d="M5 30h28" stroke={c} strokeWidth="1.5" />
        <path d="M5 28v4M33 28v4" stroke={c} strokeWidth="1.5" />
      </svg>
      {BRAND.name}
    </span>
  );
}

const HELMET: Record<string, string> = { formwork: "#d4f25a", rebar: "#ff7a45", plaster: "#ffffff", tiling: "#7fb2e5", masonry: "#f2c14e" };
const SKIN = ["#f0d7bf", "#b9865f", "#ebcda8", "#c99a72", "#e3bf9c", "#8d5a3b"];
const SHIRT = ["#0e2a44", "#4a5a66", "#7c4a2e", "#2e6b3f", "#163a5c", "#5b4636"];

/** Worker avatar: uploaded photo if present, otherwise a line-drawn figure with a helmet in the trade's colour. */
export function Avatar({ w, size = 48, className = "" }: { w: { worker_id?: number; id?: number; photo?: string | null; trade: string; first_name?: string }; size?: number; className?: string }) {
  const id = w.worker_id ?? w.id ?? 0;
  if (w.photo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${w.photo}`} alt={w.first_name ?? ""} width={size} height={size} className={`shrink-0 rounded-full border-[1.5px] border-ink object-cover ${className}`} style={{ width: size, height: size }} />;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`shrink-0 rounded-full border-[1.5px] border-ink ${className}`} style={{ background: "#e9e1d0" }} aria-hidden>
      <circle cx="24" cy="26" r="9" fill={SKIN[id % SKIN.length]} />
      <path d="M8 48c1-9 7-13 16-13s15 4 16 13z" fill={SHIRT[id % SHIRT.length]} />
      <path d="M13 23a11 11 0 0 1 22 0z" fill={HELMET[w.trade] ?? "#d4f25a"} stroke="#0e2a44" strokeWidth=".8" />
      <rect x="11" y="22" width="26" height="2.6" rx="1.3" fill={HELMET[w.trade] ?? "#d4f25a"} stroke="#0e2a44" strokeWidth=".8" />
    </svg>
  );
}

export function Rating({ value, count, size = "sm" }: { value: number | null; count?: number; size?: "sm" | "lg" }) {
  if (value == null) return <span className="chip-info">חדש במערכת</span>;
  return (
    <span className={`inline-flex items-center gap-1 ${size === "lg" ? "text-base" : "text-[13px]"}`}>
      <svg viewBox="0 0 20 20" className={size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5"} fill="#0e2a44" aria-hidden>
        <path d="m10 1.5 2.6 5.5 6 .7-4.4 4.1 1.2 5.9L10 14.8l-5.4 2.9 1.2-5.9L1.4 7.7l6-.7z" />
      </svg>
      <b className="num">{value.toFixed(1)}</b>
      {count != null && <span className="text-muted">({count} עבודות)</span>}
    </span>
  );
}

export function TradeChip({ k }: { k: string }) {
  return <span className="chip-muted">{trade(k).label}</span>;
}

/** Page title in the "drawing sheet" style: small spaced eyebrow, serif title, muted subtitle. */
export function PageHead({ title, sub, children, back, eyebrow }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; back?: string; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 pb-4">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-block text-[13px] font-semibold text-muted hover:text-ink">
            → חזרה
          </Link>
        )}
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[30px] font-bold leading-tight text-ink md:text-[38px]">{title}</h1>
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
    <div className={`sheet h-full p-5 ${dark ? "blueprint border-ink" : ""}`}>
      <div className={`text-[13px] font-semibold ${dark ? "text-white/70" : "text-muted"}`}>{label}</div>
      <div className={`mt-1 font-display text-[40px] font-bold leading-none ${dark ? "text-hazard" : tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : "text-ink"}`}>{value}</div>
      {hint && <div className={`mt-2 text-[13px] ${dark ? "text-white/75" : "text-muted"}`}>{hint}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="sheet paper-grid grid place-items-center gap-3 px-6 py-14 text-center">
      <svg viewBox="0 0 120 40" className="h-8 w-28 text-ink/40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M4 20h112M4 12v16M116 12v16M30 30V14h60v16" strokeDasharray="4 4" />
      </svg>
      <div className="font-display text-xl font-bold text-ink">{title}</div>
      {children && <div className="max-w-md text-[15px] text-muted">{children}</div>}
    </div>
  );
}

export function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const r = 42, c = 2 * Math.PI * r;
  const color = score >= 90 ? "#2e6b3f" : score >= 75 ? "#0e2a44" : score >= 60 ? "#9a5a00" : "#b3261e";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`ציון ${score}`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5ddcc" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 50 50)" />
      {[0, 90, 180, 270].map((a) => <line key={a} x1="50" y1="2" x2="50" y2="9" stroke="#0e2a44" strokeWidth="1.2" transform={`rotate(${a} 50 50)`} />)}
      <text x="50" y="60" textAnchor="middle" fontSize="30" fontWeight="700" fontFamily="Frank Ruhl Libre" fill="#0e2a44">{score}</text>
    </svg>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const cls = { info: "border-info bg-info-soft text-info", warn: "border-warn bg-warn-soft text-warn", bad: "border-bad bg-bad-soft text-bad", ok: "border-ok bg-ok-soft text-ok" }[tone];
  return <div className={`rounded-[3px] border-s-4 px-4 py-3 text-[15px] ${cls}`}>{children}</div>;
}
