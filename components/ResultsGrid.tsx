"use client";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Rating } from "./ui";
import { ICheck, IPlus } from "./icons";

export type Hit = {
  id: number; name: string; trade: string; tradeLabel: string; years: number; country: string; skills: string[];
  rating: number | null; jobs: number; arrival: number | null; match: number | null; withContractor: number;
  agency: string; agencyScore: number; agencyTier: string; daily: number; hourly: number; docs: { label: string; ok: boolean; soon?: boolean }[];
  photo: string | null;
};

const ils = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");

export function ResultsGrid({ hits, qs, count, days, canBook }: { hits: Hit[]; qs: string; count: number; days: number; canBook: boolean }) {
  const [sel, setSel] = useState<number[]>([]);
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chosen = hits.filter((h) => sel.includes(h.id));
  const perDay = chosen.reduce((a, h) => a + h.daily, 0);
  return (
    <>
      <div className="grid gap-x-8 border-t border-ink/15 lg:grid-cols-2">
        {hits.map((h) => {
          const on = sel.includes(h.id);
          return (
            <article key={h.id} className={`relative grid grid-cols-[56px_1fr_auto] items-center gap-x-4 gap-y-1 border-b border-dashed border-line px-2 py-4 transition ${on ? "bg-hazard-soft before:absolute before:inset-y-3 before:start-0 before:w-[3px] before:bg-ink" : ""}`}>
              <Link href={`/c/worker/${h.id}?${qs}`} className="row-span-2 self-start"><Avatar w={{ id: h.id, trade: h.trade, photo: h.photo }} size={56} /></Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2">
                  <Link href={`/c/worker/${h.id}?${qs}`} className="font-display text-[20px] font-bold text-ink hover:underline">{h.name}</Link>
                  {h.withContractor > 0 && <span className="chip-hazard">עבד אצלך {h.withContractor}×</span>}
                </div>
                <div className="text-[14px] text-muted">{h.tradeLabel} · {h.years} שנות ניסיון · {h.country}</div>
              </div>
              <div className="text-left">
                <div className="font-display text-[24px] font-bold leading-none text-ink num">{ils(h.daily)}</div>
                <div className="text-[12px] text-muted">ליום + מע״מ</div>
              </div>
              <div className="col-start-2 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
                  <Rating value={h.rating} count={h.jobs} />
                  {h.arrival != null && <span>הגעה <b className="num text-ink">{Math.round(h.arrival * 100)}%</b></span>}
                  {h.match != null && <span>התאמה <b className="num text-ink">{Math.round(h.match * 100)}%</b></span>}
                </div>
                <div className="flex flex-wrap gap-x-3 text-[13px] font-bold">
                  {h.docs.map((d) => <span key={d.label} className={d.soon ? "text-warn" : "text-ok"}>✓ {d.label}</span>)}
                </div>
                <div className="text-[12px] text-muted">{h.agency} · אמינות <b className="num">{h.agencyScore}</b></div>
              </div>
              <button onClick={() => toggle(h.id)} className={`self-end ${on ? "btn-primary btn-sm" : "btn-ghost btn-sm"}`} aria-pressed={on}>
                {on ? <><ICheck className="h-4 w-4" />נבחר</> : <><IPlus className="h-4 w-4" />הוספה</>}
              </button>
            </article>
          );
        })}
      </div>

      {sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-[60px] z-40 px-3 md:bottom-4">
          <div className="blueprint mx-auto flex max-w-3xl items-center gap-3 rounded-[3px] border-b-[3px] border-hazard p-3 ps-5 shadow-2xl">
            <div className="flex -space-x-2 space-x-reverse">
              {chosen.slice(0, 4).map((h) => <Avatar key={h.id} w={{ id: h.id, trade: h.trade, photo: h.photo }} size={32} className="ring-2 ring-ink" />)}
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-display text-[17px] font-bold">{sel.length} מתוך {count} נבחרו</div>
              <div className="text-white/70"><span className="num">{ils(perDay)}</span> ליום{days > 1 ? ` · ${ils(perDay * days)} ל-${days} ימים` : ""} + מע״מ</div>
            </div>
            {canBook ? (
              <Link href={`/c/checkout?${qs}&w=${sel.join(",")}`} className="btn-hazard">המשך להזמנה</Link>
            ) : (
              <span className="text-xs text-white/70">ההזמנה תיפתח אחרי אימות החשבון</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
