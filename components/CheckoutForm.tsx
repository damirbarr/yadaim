"use client";
import { useActionState, useMemo, useState } from "react";
import { createBooking } from "@/app/actions/contractor";
import type { FormState } from "@/app/actions/auth";
import { Avatar } from "./ui";

type W = { id: number; name: string; trade: string; tradeLabel: string; years: number; base: number; agencyId: number; agency: string; lodgingDiscount: number; transportRate: number; photo: string | null; docsUntil: string };
const fmt = (n: number, d = 0) => n.toLocaleString("he-IL", { minimumFractionDigits: d, maximumFractionDigits: d });

export function CheckoutForm({ workers, q, defaultAddress }: { workers: W[]; q: { trade: string; city: string; date: string; days: number; lodging: string; transport: string; hours: number; dateLabel: string }; defaultAddress: string }) {
  const [lodging, setLodging] = useState(q.lodging);
  const [transport, setTransport] = useState(q.transport);
  const [hours, setHours] = useState(q.hours);
  const [state, action, pending] = useActionState<FormState, FormData>(createBooking, undefined);

  const calc = useMemo(() => {
    const rows = workers.map((w) => {
      const lodgingAdj = lodging === "contractor" ? -w.lodgingDiscount : 0;
      const transportAdj = transport === "agency" ? w.transportRate : 0;
      const hourly = w.base + lodgingAdj + transportAdj;
      return { w, lodgingAdj, transportAdj, hourly, day: hourly * hours };
    });
    const perDay = rows.reduce((a, r) => a + r.day, 0);
    const net = perDay * q.days;
    return { rows, perDay, net, vat: net * 0.18, gross: net * 1.18 };
  }, [workers, lodging, transport, hours, q.days]);
  const avgBase = workers.reduce((a, w) => a + w.base, 0) / workers.length;
  const avgL = workers.reduce((a, w) => a + w.lodgingDiscount, 0) / workers.length;
  const avgT = workers.reduce((a, w) => a + w.transportRate, 0) / workers.length;
  const agencies = new Set(workers.map((w) => w.agencyId)).size;

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <input type="hidden" name="w" value={workers.map((w) => w.id).join(",")} />
      <input type="hidden" name="trade" value={q.trade} />
      <input type="hidden" name="date" value={q.date} />
      <input type="hidden" name="days" value={q.days} />
      <input type="hidden" name="city" value={q.city} />
      <input type="hidden" name="lodging" value={lodging} />
      <input type="hidden" name="transport" value={transport} />

      <div className="space-y-4">
        <div className="card divide-y divide-line">
          {workers.map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-4">
              <Avatar w={{ id: w.id, trade: w.trade, photo: w.photo }} size={44} />
              <div className="flex-1">
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-muted">{w.tradeLabel} · {w.years} שנים · {w.agency}</div>
              </div>
              <span className="chip-ok">אישורים בתוקף עד סוף העבודה</span>
            </div>
          ))}
        </div>

        <div className="card space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label">לינה</div>
              <div className="seg">
                <label><input type="radio" checked={lodging === "contractor"} onChange={() => setLodging("contractor")} />אצלי (−₪{fmt(avgL)}/ש׳)</label>
                <label><input type="radio" checked={lodging === "agency"} onChange={() => setLodging("agency")} />אצל התאגיד</label>
              </div>
            </div>
            <div>
              <div className="label">הסעה לאתר</div>
              <div className="seg">
                <label><input type="radio" checked={transport === "agency"} onChange={() => setTransport("agency")} />התאגיד מסיע (+₪{fmt(avgT)}/ש׳)</label>
                <label><input type="radio" checked={transport === "contractor"} onChange={() => setTransport("contractor")} />אני מסדר</label>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
            <div>
              <label className="label">כתובת האתר ב{q.city}</label>
              <input className="input" name="address" required defaultValue={defaultAddress} placeholder="רחוב ומספר / שם הפרויקט" />
            </div>
            <div>
              <label className="label">שעת התחלה</label>
              <select className="input" name="start_time" defaultValue="07:00">
                {["06:00", "06:30", "07:00", "07:30", "08:00"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">שעות ביום</label>
              <select className="input" name="hours" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                {[6, 7, 8, 9, 10].map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">הערות לתאגיד (לא חובה)</label>
            <textarea className="input" name="notes" rows={2} placeholder="למשל: עבודה בקומה 6, להביא כלי עבודה אישיים" />
          </div>
        </div>
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-20">
        <h2 className="mb-3 text-[20px] font-bold text-ink">פירוט מחיר</h2>
        <dl className="space-y-1.5 text-sm">
          <Row k={`תעריף בסיס · ${hours} × ₪${fmt(avgBase)}`} v={fmt(avgBase * hours)} />
          <Row k={`לינה אצלי · ${hours} × −₪${fmt(avgL)}`} v={lodging === "contractor" ? "−" + fmt(avgL * hours) : "—"} />
          <Row k={`הסעה · ${hours} × ₪${fmt(avgT)}`} v={transport === "agency" ? fmt(avgT * hours) : "—"} />
          <Row k="ליום לעובד (ממוצע)" v={fmt(calc.perDay / workers.length)} strong />
          <Row k={`${workers.length} עובדים × ${q.days} ${q.days > 1 ? "ימים" : "יום"}`} v={fmt(calc.net)} />
          <Row k="מע״מ 18%" v={fmt(calc.vat, 2)} />
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">סה״כ</span>
          <span className="font-display text-3xl font-bold num">₪{fmt(calc.gross, 2)}</span>
        </div>
        {state?.error && <p className="mt-3 text-sm text-bad">{state.error}</p>}
        <button className="btn-hazard mt-4 w-full py-3 text-base" disabled={pending}>{pending ? "שולח…" : agencies > 1 ? `שליחה ל-${agencies} תאגידים` : "שליחת הזמנה לתאגיד"}</button>
        <ul className="mt-3 space-y-1 text-xs text-muted">
          <li>• התשלום ישירות לתאגיד בסוף העבודה, לפי השעות שאישרת באפליקציה.</li>
          <li>• התאמה מובטחת: מי שהגיע לא תואם — לא משלמים על היום.</li>
          <li>• ב-18:00 ערב לפני הצוות ננעל ותקבל שמות, תמונות ושעת איסוף.</li>
        </ul>
      </aside>
    </form>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-line pt-1.5 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  );
}
