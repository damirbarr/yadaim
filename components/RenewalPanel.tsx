"use client";
import { useState } from "react";
import { markRenewal } from "@/app/actions/agency";
import { Avatar } from "./ui";
import { IWhatsapp } from "./icons";
import { useI18n } from "@/lib/i18n/client";

/** `doc` is the document's display name, `expires`/`requested` are ISO dates and `wa` is a ready WhatsApp link. */
export type Row = { id: number; workerId: number; trade: string; photo: string | null; country: string; name: string; doc: string; expires: string | null; daysLeft: number | null; requested: string | null; wa: string; status: string };

export function RenewalPanel({ rows, readOnly = false }: { rows: Row[]; readOnly?: boolean }) {
  const { t, fmt } = useI18n();
  const [sel, setSel] = useState<number[]>(rows.filter((r) => r.daysLeft != null && r.daysLeft <= 14 && !r.requested).map((r) => r.id));
  const [open, setOpen] = useState(false);
  const chosen = rows.filter((r) => sel.includes(r.id));
  const counts = { expired: rows.filter((r) => (r.daysLeft ?? 1) < 0).length, d14: rows.filter((r) => r.daysLeft != null && r.daysLeft >= 0 && r.daysLeft <= 14).length, d60: rows.filter((r) => r.daysLeft != null && r.daysLeft > 14).length };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="chip-bad">{t("agency.renewal.expired", { n: counts.expired })}</span>
        <span className="chip-warn">{t("agency.renewal.within14", { n: counts.d14 })}</span>
        <span className="chip-info">{t("agency.renewal.within60", { n: counts.d60 })}</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="tbl min-w-[640px]">
          <thead><tr><th className="w-8" /><th>{t("agency.renewal.colWorker")}</th><th>{t("agency.renewal.colDoc")}</th><th>{t("agency.renewal.colExpires")}</th><th>{t("agency.renewal.colStatus")}</th><th>{t("agency.renewal.colRequest")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={sel.includes(r.id) ? "bg-hazard-soft" : ""}>
                <td><input type="checkbox" aria-label={r.name} disabled={readOnly} className="h-4 w-4 accent-ink" checked={sel.includes(r.id)} onChange={() => setSel((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} /></td>
                <td><a href={`/a/workers/${r.workerId}`} className="flex items-center gap-2 font-medium hover:underline"><Avatar w={{ id: r.workerId, trade: r.trade, photo: r.photo, country: r.country }} size={28} />{r.name}</a></td>
                <td>{r.doc}</td>
                <td className="num">{r.expires ? fmt.fullDate(r.expires) : "-"}</td>
                <td>{(r.daysLeft ?? 0) < 0 ? <span className="chip-bad">{t("agency.renewal.statusExpired")}</span> : <span className={(r.daysLeft ?? 99) <= 14 ? "chip-warn" : "chip-info"}>{t("agency.days", { n: r.daysLeft ?? 0 })}</span>}</td>
                <td className="text-xs text-muted">{r.requested ? t("agency.renewal.sentOn", { date: fmt.date(r.requested) }) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && <div className="flex flex-wrap items-center gap-3">
        <button className="btn-hazard" disabled={!sel.length} onClick={() => setOpen(true)}><IWhatsapp className="h-4 w-4" />{t("agency.renewal.send", { n: sel.length })}</button>
        <span className="text-sm text-muted">{t("agency.renewal.explain")}</span>
      </div>}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={() => setOpen(false)}>
          <div className="card max-h-[85vh] w-full max-w-lg overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-line px-5 py-3">
              <h3 className="text-[18px] font-bold text-ink">{t("agency.renewal.modalTitle", { n: chosen.length })}</h3>
              <p className="text-xs text-muted">{t("agency.renewal.modalHint")}</p>
            </div>
            <ul>
              {chosen.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-b border-line px-5 py-2.5 last:border-0">
                  <Avatar w={{ id: r.workerId, trade: r.trade, photo: r.photo, country: r.country }} size={32} />
                  <span className="flex-1 text-sm">{r.name} · {r.doc}</span>
                  <a href={r.wa} target="_blank" rel="noreferrer" className="btn-ok btn-sm"><IWhatsapp className="h-4 w-4" />{t("agency.renewal.sendOne")}</a>
                </li>
              ))}
            </ul>
            <form action={markRenewal} onSubmit={() => setTimeout(() => setOpen(false), 50)} className="flex justify-end gap-2 p-4">
              {sel.map((id) => <input key={id} type="hidden" name="doc" value={id} />)}
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{t("common.close")}</button>
              <button className="btn-primary">{t("agency.renewal.markSent")}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
