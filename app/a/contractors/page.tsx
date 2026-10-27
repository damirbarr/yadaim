import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get } from "@/lib/db";
import { REGIONS } from "@/lib/domain";
import { importContacts, toggleOptOut } from "@/app/actions/agency";
import { ImportForm } from "@/components/ImportForm";
import { ContactForm } from "@/components/ContactForm";
import { PageHead } from "@/components/ui";
import { waLink } from "@/lib/wa";
import { IWhatsapp } from "@/components/icons";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("market.contractors.title") };
}
type C = { id: number; name: string; company: string | null; phone: string; city: string | null; region: string | null; source: string; opted_out: number; last_sent_at: string | null; opened: number; booked: number };
const SOURCES = ["whatsapp", "phone", "csv", "manual"] as const;
const COLS = ["name", "company", "phone", "area", "source", "opened", "booked", "lastSent"] as const;

export default async function Contractors({ searchParams }: { searchParams: Promise<{ region?: string; q?: string }> }) {
  const { user, agencyId } = await requireAgency();
  const { t, fmt } = await getI18n();
  const manage = can(user, "agency.crm.manage");
  const sp = await searchParams;
  const rows = (await all(
    `SELECT c.*, (SELECT COUNT(*) FROM campaign_recipients r WHERE r.contact_id = c.id AND r.opened_at IS NOT NULL) AS opened,
            (SELECT COUNT(*) FROM campaign_recipients r WHERE r.contact_id = c.id AND r.booked_at IS NOT NULL) AS booked
     FROM crm_contacts c WHERE c.agency_id = ? ORDER BY booked DESC, opened DESC, c.name`
  , agencyId)) as C[];
  const list = rows.filter((c) => (!sp.region || c.region === sp.region) && (!sp.q || `${c.name} ${c.company ?? ""} ${c.phone}`.includes(sp.q)));
  const by = (k: string) => rows.filter((c) => c.region === k).length;
  const src = (s: string) => rows.filter((c) => c.source === s).length;
  const clients = ((await get(`SELECT COUNT(DISTINCT contractor_id) AS n FROM bookings WHERE agency_id = ?`, agencyId)) as { n: number }).n;
  const summary = [
    t("market.contractors.fromWhatsapp", { n: src("whatsapp") }),
    t("market.contractors.fromPhone", { n: src("phone") + src("manual") }),
    t("market.contractors.fromFile", { n: src("csv") }),
    t("market.contractors.optedOut", { n: rows.filter((r) => r.opted_out).length }),
    t("market.contractors.clients", { n: clients }),
  ];
  return (
    <div className="space-y-5">
      <PageHead title={t("market.contractors.heading")} sub={t("market.contractors.sub")} />
      <div className="grid gap-3 lg:grid-cols-2">
        {manage
          ? <ImportForm action={importContacts} title={t("market.contractors.importTitle")} hint={t("market.contractors.importHint")} templates={[{ label: t("market.contractors.template"), href: "/templates/contractors.csv" }]} paste />
          : <div className="card p-4 text-sm text-muted">{t("market.contractors.viewOnly")}</div>}
        <div className="card p-4">
          <div className="flex items-baseline gap-2"><span className="font-display text-4xl font-bold num">{rows.length}</span><span className="text-muted">{t("market.contractors.inPool", { n: rows.length })}</span></div>
          <div className="mt-1 text-sm text-muted">{summary.join(" · ")}</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <a href="/a/contractors" className={!sp.region ? "chip-hazard px-3 py-1" : "chip-muted px-3 py-1"}>{t("market.contractors.all")}</a>
            {REGIONS.map((r) => by(r.key) > 0 && <a key={r.key} href={`/a/contractors?region=${r.key}`} className={sp.region === r.key ? "chip-hazard px-3 py-1" : "chip-muted px-3 py-1"}>{fmt.region(r.key)} · <span className="num">{by(r.key)}</span></a>)}
          </div>
          <form className="mt-3"><input name="q" defaultValue={sp.q} className="input" placeholder={t("market.contractors.search")} /></form>
        </div>
      </div>
      {manage && <ContactForm />}
      <div className="card overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr>{COLS.map((k) => <th key={k}>{t(`market.contractors.cols.${k}`)}</th>)}<th /></tr></thead>
          <tbody>
            {list.slice(0, 200).map((c) => (
              <tr key={c.id} className={c.opted_out ? "opacity-50" : ""}>
                <td className="font-medium">{c.name}</td>
                <td className="text-muted">{c.company ?? "-"}</td>
                <td><a href={waLink(c.phone, t("market.contractors.hello", { name: c.name.split(" ")[0] }))} target="_blank" className="inline-flex items-center gap-1 whitespace-nowrap num hover:underline"><IWhatsapp className="h-3.5 w-3.5 text-ok" /><bdi dir="ltr">{c.phone}</bdi></a></td>
                <td>{c.city ? fmt.city(c.city) : c.region ? fmt.region(c.region) : "-"}</td>
                <td><span className="chip-muted">{(SOURCES as readonly string[]).includes(c.source) ? t(`market.contractors.sources.${c.source as (typeof SOURCES)[number]}`) : c.source}</span></td>
                <td className="num">{c.opened || ""}</td>
                <td>{c.booked ? <span className="chip-ok num">{c.booked}</span> : ""}</td>
                <td className="num text-xs text-muted">{c.last_sent_at ? fmt.date(c.last_sent_at.slice(0, 10)) : ""}</td>
                <td>{manage && <form action={toggleOptOut}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-muted underline">{c.opted_out ? t("market.contractors.optIn") : t("market.contractors.optOut")}</button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{t("market.contractors.privacy")}</p>
    </div>
  );
}
