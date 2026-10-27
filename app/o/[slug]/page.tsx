import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { all, get, insert, run, tx } from "@/lib/db";
import { agencyReliability, displayName, idleForecast, workerStats, type Agency, type Worker } from "@/lib/queries";
import { countryLabel, ddmm, hourlyFor, ils, regionLabel, trade, TRADES, DEFAULT_OPTS } from "@/lib/domain";
import { Avatar, Logo, Rating, ScoreRing } from "@/components/ui";

export default async function Offer({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ trade?: string }> }) {
  const a = (await get(`SELECT * FROM agencies WHERE slug = ?`, (await params).slug)) as Agency | undefined;
  if (!a) notFound();
  const sp = await searchParams;
  const u = await currentUser();
  const rel = (await agencyReliability(a.id));
  const idle = (await idleForecast(a.id, 10));
  const focus = TRADES.some((t) => t.key === sp.trade) ? sp.trade! : idle[0]?.trade ?? "formwork";
  const f = idle.find((i) => i.trade === focus);
  const workers = (await all(`SELECT * FROM workers WHERE agency_id = ? AND active = 1 AND trade = ?`, a.id, focus)) as Worker[];
  const st = (await workerStats(workers.map((w) => w.id)));
  const top = workers.filter((w) => !f || f.workerIds.includes(w.id)).sort((x, y) => (st.get(y.id)!.rating ?? 0) - (st.get(x.id)!.rating ?? 0)).slice(0, 6);
  const from = Math.min(...top.map((w) => hourlyFor(w.hourly_rate, a, DEFAULT_OPTS) * 9));
  const cta = u?.role === "contractor" ? `/c/search?trade=${focus}&date=${f?.from ?? ""}&count=2` : `/signup?role=contractor`;
  return (
    <div className="min-h-dvh">
      <header className="bg-ink text-white"><div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4"><Link href="/"><Logo dark /></Link>{!u && <Link href="/login" className="text-sm text-white/70">כניסה</Link>}</div></header>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <section className="flex flex-wrap items-center gap-5">
          <ScoreRing score={rel.score} size={96} />
          <div className="flex-1">
            <div className="text-sm text-muted">תאגיד מורשה · היתר <span className="num">{a.license_no}</span>{a.verified ? " · ✓ מאומת" : ""}</div>
            <h1 className="text-3xl font-bold">{a.name}</h1>
            <p className="text-muted">{a.about}</p>
            <div className="mt-1 text-sm text-muted">אזורים: {a.regions.split(",").map(regionLabel).join(" · ")}</div>
          </div>
        </section>
        {f && (
          <div className="rounded-[3px] bg-hazard p-5">
            <div className="font-display text-2xl font-bold">{f.workerCount} {trade(focus).plural} פנויים · {ddmm(f.from)}–{ddmm(f.to)}</div>
            <div className="text-sm">כל האישורים בתוקף · מחיר יומי סופי {isFinite(from) ? <>מ-<b className="num">{ils(from)}</b> + מע״מ</> : ""} · אפשר להזמין גם ליום אחד{a.min_days > 1 ? ` (מינימום ${a.min_days} ימים)` : ""}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {TRADES.map((t) => <Link key={t.key} href={`?trade=${t.key}`} className={t.key === focus ? "chip-hazard px-3 py-1.5" : "chip-muted px-3 py-1.5"}>{t.plural}</Link>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {top.map((w) => (
            <div key={w.id} className="card flex gap-3 p-3">
              <Avatar w={w} size={64} />
              <div className="min-w-0">
                <div className="font-semibold">{displayName(w)}</div>
                <div className="text-xs text-muted">{trade(w.trade).label} · {w.years} שנים · {countryLabel(w.country)}</div>
                <Rating value={st.get(w.id)!.rating} count={st.get(w.id)!.jobs} />
              </div>
            </div>
          ))}
        </div>
        <Link href={cta} className="btn-primary w-full py-3 text-base">{u?.role === "contractor" ? "לבחירת עובדים והזמנה" : "הרשמה חינם לקבלנים והזמנה"}</Link>
        <p className="text-center text-xs text-muted">התשלום ישירות לתאגיד, לפי שעות שאישרתם. מי שלא מתאים בבוקר — לא משלמים עליו.</p>
      </main>
    </div>
  );
}
