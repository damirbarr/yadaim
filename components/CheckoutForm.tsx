"use client";
import { useActionState, useMemo, useState } from "react";
import { createBooking } from "@/app/actions/contractor";
import type { FormState } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { LOCK_HOUR, VAT } from "@/lib/domain";
import { Avatar } from "./ui";

type W = { id: number; name: string; trade: string; years: number; base: number; agencyId: number; agency: string; lodgingDiscount: number; transportRate: number; photo: string | null; country: string; docsUntil: string };

export function CheckoutForm({ workers, q, defaultAddress }: { workers: W[]; q: { trade: string; city: string; date: string; days: number; lodging: string; transport: string; hours: number }; defaultAddress: string }) {
  const { t, fmt } = useI18n();
  const n = fmt.num;
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
    return { rows, perDay, net, vat: net * VAT, gross: net * (1 + VAT) };
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
              <Avatar w={{ id: w.id, trade: w.trade, photo: w.photo, country: w.country }} size={44} />
              <div className="flex-1">
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-muted">{fmt.trade(w.trade)} · {t("contractor.count.years", { n: w.years })} · {w.agency}</div>
              </div>
              <span className="chip-ok">{t("contractor.checkout.docsValid")}</span>
            </div>
          ))}
        </div>

        <div className="card space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="label">{t("contractor.prices.lodging")}</div>
              <div className="seg">
                <label><input type="radio" checked={lodging === "contractor"} onChange={() => setLodging("contractor")} />{t("contractor.prices.lodgingOursAdj", { amount: fmt.money(avgL) })}</label>
                <label><input type="radio" checked={lodging === "agency"} onChange={() => setLodging("agency")} />{t("contractor.prices.lodgingAgency")}</label>
              </div>
            </div>
            <div>
              <div className="label">{t("contractor.prices.transport")}</div>
              <div className="seg">
                <label><input type="radio" checked={transport === "agency"} onChange={() => setTransport("agency")} />{t("contractor.prices.transportAgencyAdj", { amount: fmt.money(avgT) })}</label>
                <label><input type="radio" checked={transport === "contractor"} onChange={() => setTransport("contractor")} />{t("contractor.prices.transportOurs")}</label>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
            <div>
              <label className="label">{t("contractor.checkout.address", { city: fmt.city(q.city) })}</label>
              <input className="input" name="address" required defaultValue={defaultAddress} placeholder={t("contractor.checkout.addressPlaceholder")} />
            </div>
            <div>
              <label className="label">{t("contractor.checkout.startTime")}</label>
              <select className="input" name="start_time" defaultValue="07:00">
                {["06:00", "06:30", "07:00", "07:30", "08:00"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("contractor.checkout.hoursPerDay")}</label>
              <select className="input" name="hours" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                {[6, 7, 8, 9, 10].map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">{t("contractor.checkout.notes")}</label>
            <textarea className="input" name="notes" rows={2} placeholder={t("contractor.checkout.notesPlaceholder")} />
          </div>
        </div>
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-20">
        <h2 className="mb-3 text-[20px] font-bold text-ink">{t("contractor.checkout.priceTitle")}</h2>
        <dl className="space-y-1.5 text-sm">
          <Row k={t("contractor.checkout.rowBase", { hours, rate: fmt.money(avgBase) })} v={n(avgBase * hours)} />
          <Row k={t("contractor.checkout.rowLodging", { hours, rate: fmt.money(avgL) })} v={lodging === "contractor" ? "−" + n(avgL * hours) : "-"} />
          <Row k={t("contractor.checkout.rowTransport", { hours, rate: fmt.money(avgT) })} v={transport === "agency" ? n(avgT * hours) : "-"} />
          <Row k={t("contractor.checkout.rowPerWorker")} v={n(calc.perDay / workers.length)} strong />
          <Row k={t("contractor.checkout.rowTotal", { workers: t("contractor.count.workers", { n: workers.length }), days: t("contractor.count.days", { n: q.days }) })} v={n(calc.net)} />
          <Row k={t("contractor.checkout.rowVat", { pct: Math.round(VAT * 100) })} v={n(calc.vat, 2)} />
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm text-muted">{t("contractor.checkout.total")}</span>
          <span className="font-display text-3xl font-bold num">{fmt.money(calc.gross, 2)}</span>
        </div>
        {state?.error && <p className="mt-3 text-sm text-bad">{state.error}</p>}
        <button className="btn-hazard mt-4 w-full py-3 text-base" disabled={pending}>{pending ? t("contractor.checkout.sending") : t("contractor.checkout.send", { n: agencies })}</button>
        <ul className="mt-3 space-y-1 text-xs text-muted">
          <li>• {t("contractor.checkout.payNote")}</li>
          <li>• {t("contractor.checkout.fitNote")}</li>
          <li>• {t("contractor.checkout.lockNote", { time: LOCK_HOUR })}</li>
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
