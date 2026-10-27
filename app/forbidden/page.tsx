import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { PERMISSIONS, ORG_ROLE_LABEL, type Perm } from "@/lib/rbac";
import { Logo } from "@/components/ui";

export const metadata = { title: "אין הרשאה" };

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const u = await currentUser();
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-4 text-center">
      <Logo className="justify-self-center" />
      <div className="sheet paper-grid space-y-2 border-t-[3px] border-t-signal p-8">
        <div className="eyebrow">שגיאה 403 · אין גישה</div>
        <h1 className="text-[30px] font-bold text-ink">אין לך הרשאה לפעולה הזו</h1>
        {p && p in PERMISSIONS && <p className="text-sm text-muted">נדרשת הרשאה: {PERMISSIONS[p as Perm]}</p>}
        {u && <p className="text-sm text-muted">התפקיד שלך: {ORG_ROLE_LABEL[u.org_role]}. בעלי החשבון יכולים לשנות אותו בדף “צוות”.</p>}
        <Link href={u ? homeFor(u.role) : "/"} className="btn-primary mt-2">חזרה</Link>
      </div>
    </main>
  );
}
