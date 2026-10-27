import { requireAgency } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { all, get, insert, run, tx } from "@/lib/db";
import { ddmm, regionLabel, REGIONS } from "@/lib/domain";
import { importContacts, toggleOptOut } from "@/app/actions/agency";
import { ImportForm } from "@/components/ImportForm";
import { ContactForm } from "@/components/ContactForm";
import { PageHead } from "@/components/ui";
import { waLink } from "@/lib/wa";
import { IWhatsapp } from "@/components/icons";

export const metadata = { title: "מאגר הקבלנים" };
type C = { id: number; name: string; company: string | null; phone: string; city: string | null; region: string | null; source: string; opted_out: number; last_sent_at: string | null; opened: number; booked: number };

export default async function Contractors({ searchParams }: { searchParams: Promise<{ region?: string; q?: string }> }) {
  const { user, agencyId } = await requireAgency();
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
  return (
    <div className="space-y-5">
      <PageHead title="מאגר הקבלנים שלי" sub="קבלנים שעבדתם איתם, שמרתם בטלפון או שפנו אליכם בוואטסאפ. המערכת תשווק להם את העובדים הפנויים שלכם. המאגר שלכם בלבד — לא מוצג לתאגידים אחרים." />
      <div className="grid gap-3 lg:grid-cols-2">
        {manage ? <ImportForm action={importContacts} title="ייבוא מאקסל או הדבקה מוואטסאפ" hint="קובץ עם עמודות שם, חברה, טלפון, עיר — או רשימת מספרים מקבוצת וואטסאפ. כפולים מתמזגים." templates={[{ label: "הורדת תבנית", href: "/templates/contractors.csv" }]} paste /> : <div className="card p-4 text-sm text-muted">צפייה בלבד</div>}
        <div className="card p-4">
          <div className="flex items-baseline gap-2"><span className="font-display text-4xl font-bold num">{rows.length}</span><span className="text-muted">קבלנים במאגר</span></div>
          <div className="mt-1 text-sm text-muted">{src("whatsapp")} מוואטסאפ · {src("phone") + src("manual")} מהטלפון · {src("csv")} מקובץ · {rows.filter((r) => r.opted_out).length} ביקשו לא לקבל הודעות · {clients} הזמינו דרך המערכת</div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <a href="/a/contractors" className={!sp.region ? "chip-hazard px-3 py-1" : "chip-muted px-3 py-1"}>הכול</a>
            {REGIONS.map((r) => by(r.key) > 0 && <a key={r.key} href={`/a/contractors?region=${r.key}`} className={sp.region === r.key ? "chip-hazard px-3 py-1" : "chip-muted px-3 py-1"}>{r.label} · {by(r.key)}</a>)}
          </div>
          <form className="mt-3"><input name="q" defaultValue={sp.q} className="input" placeholder="חיפוש לפי שם / חברה / טלפון" /></form>
        </div>
      </div>
      {manage && <ContactForm />}
      <div className="card overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>שם</th><th>חברה</th><th>טלפון</th><th>אזור</th><th>מקור</th><th>פתח הצעות</th><th>הזמין</th><th>נשלח לאחרונה</th><th /></tr></thead>
          <tbody>
            {list.slice(0, 200).map((c) => (
              <tr key={c.id} className={c.opted_out ? "opacity-50" : ""}>
                <td className="font-medium">{c.name}</td>
                <td className="text-muted">{c.company ?? "—"}</td>
                <td><a href={waLink(c.phone, `שלום ${c.name.split(" ")[0]},`)} target="_blank" className="inline-flex items-center gap-1 whitespace-nowrap num hover:underline"><IWhatsapp className="h-3.5 w-3.5 text-ok" />{c.phone}</a></td>
                <td>{c.city ?? (c.region ? regionLabel(c.region) : "—")}</td>
                <td><span className="chip-muted">{{ whatsapp: "וואטסאפ", phone: "טלפון", csv: "קובץ", manual: "ידני" }[c.source] ?? c.source}</span></td>
                <td className="num">{c.opened || ""}</td>
                <td>{c.booked ? <span className="chip-ok">{c.booked}</span> : ""}</td>
                <td className="num text-xs text-muted">{c.last_sent_at ? ddmm(c.last_sent_at.slice(0, 10)) : ""}</td>
                <td>{manage && <form action={toggleOptOut}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-muted underline">{c.opted_out ? "החזרה לדיוור" : "הסרה מדיוור"}</button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">🔒 פרטיות: רק אתם רואים את המאגר. כל קבלן יכול להסיר את עצמו מהודעות בכל רגע, והמערכת לא שולחת יותר מהודעה אחת ב-3 ימים לאותו קבלן.</p>
    </div>
  );
}
