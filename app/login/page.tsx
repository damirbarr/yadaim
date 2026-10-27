import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, devBypass, googleEnabled, homeFor } from "@/lib/auth";
import { Logo, Notice } from "@/components/ui";

export const metadata = { title: "כניסה" };

const ERR: Record<string, string> = {
  oauth: "ההתחברות עם גוגל לא הושלמה. נסו שוב.",
  disabled: "החשבון הושבת. פנו למנהל המערכת.",
  google_not_configured: "ההתחברות עם גוגל עוד לא הוגדרה בשרת הזה. ראו את מדריך הפריסה.",
};

function GoogleButton({ intent, children, primary }: { intent?: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a href={`/auth/google${intent ? `?intent=${intent}` : ""}`} className={`${primary ? "btn-primary" : "btn-ghost"} w-full py-3 text-base`}>
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {children}
    </a>
  );
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; intent?: string }> }) {
  const sp = await searchParams;
  const u = await currentUser();
  if (u && !u.dev) redirect(homeFor(u.role));
  const google = googleEnabled();
  return (
    <main className="grid min-h-dvh md:grid-cols-[1fr_1.1fr]">
      <section className="blueprint relative hidden flex-col justify-between p-10 md:flex">
        <Link href="/"><Logo dark /></Link>
        <div>
          <div className="text-[13px] font-bold tracking-[.16em] text-hazard">כניסה למערכת</div>
          <h2 className="mt-3 text-[56px] font-bold leading-[1.03] text-white">בונים על אנשים.<br /><em className="not-italic text-hazard">לא על הבטחות.</em></h2>
          <svg viewBox="0 0 400 40" className="mt-8 w-72" aria-hidden><g stroke="#d4f25a" strokeWidth="1.2"><path d="M4 20h392M4 12v16M396 12v16" /></g></svg>
          <p className="mt-2 max-w-sm text-[15px] text-[#c9d6e3]">קבלנים מזמינים עובד מסוים לפי מקצוע ויום. תאגידים ממלאים ימים פנויים ושומרים על תוקף האישורים.</p>
        </div>
        <span className="text-[13px] text-white/45">התאגיד הוא המעסיק החוקי ומאשר כל הצבה</span>
      </section>

      <section className="grid content-center gap-6 px-4 py-10 md:px-14">
        <Link href="/" className="justify-self-center md:hidden"><Logo /></Link>
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="sheet space-y-3 border-t-[3px] border-t-ink p-6 md:p-8">
            <div className="eyebrow">ברוכים הבאים</div>
            <h1 className="text-[34px] font-bold leading-tight text-ink">כניסה</h1>
            {sp.error && <Notice tone="bad">{ERR[sp.error] ?? "שגיאה בהתחברות"}</Notice>}
            {google ? (
              <>
                <GoogleButton intent="contractor" primary={sp.intent !== "agency"}>כניסה כקבלן עם גוגל</GoogleButton>
                <GoogleButton intent="agency" primary={sp.intent === "agency"}>כניסה כתאגיד עם גוגל</GoogleButton>
                <p className="border-t border-dashed border-line pt-3 text-[13px] text-muted">משתמשים קיימים נכנסים לאזור שלהם אוטומטית. בכניסה ראשונה נבקש כמה פרטים על החברה או התאגיד. הוזמנתם לצוות? היכנסו עם אותו אימייל.</p>
              </>
            ) : (
              <Notice tone="warn">ההתחברות עם גוגל עוד לא הוגדרה בסביבה הזו. ראו את מדריך הפריסה.</Notice>
            )}
          </div>
          {devBypass() && (
            <div className="sheet paper-grid space-y-2 border-dashed p-5 text-[14px]">
              <div className="flex items-center gap-2 font-bold text-ink"><span className="stripe h-3 w-6" />מצב פיתוח · אין צורך להתחבר</div>
              <p className="text-muted">כל האזורים פתוחים עם משתמשי הדגמה. להחלפת משתמש או תפקיד יש כפתור "מצב פיתוח" בפינת המסך.</p>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/c" className="btn-ghost btn-sm">אזור קבלן</Link>
                <Link href="/a" className="btn-ghost btn-sm">אזור תאגיד</Link>
                <Link href="/admin" className="btn-ghost btn-sm">אדמין</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
