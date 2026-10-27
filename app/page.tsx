import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { Avatar, Logo } from "@/components/ui";

const STATS = [
  ["~220", "תאגידי בנייה מורשים", "לעומת 48 לפני המלחמה"],
  ["75–80 אלף", "עובדים זרים בענף", "רובם בלי עברית או אנגלית"],
  ["18:00", "הצוות ננעל ערב לפני", "שמות, תמונות, נהג ושעת איסוף"],
  ["₪0", "על מי שלא התאים", "מסמנים בבוקר באתר, ולא משלמים"],
];

const STEPS_C = [
  ["מחפשים", "מקצוע, עיר, תאריך וכמה עובדים. רק עובדים פנויים, מתאגידים מורשים, עם אישורים בתוקף."],
  ["בוחרים לפי מי שמגיע", "תמונה, ותק, דירוג מקבלנים שכבר הזמינו, ואחוזי הגעה והתאמה. לא “נשלח מישהו”."],
  ["מחיר סופי", "כולל לינה והסעה — בוחרים מי מסיע ואיפה ישנים, והמחיר מתעדכן מיד."],
  ["ערב לפני ובבוקר", "ב-18:00 הצוות ננעל: שמות, תמונות, נהג ושעת איסוף. בבוקר — שתי שאלות באתר. לא תואם? לא משלמים."],
];

const FOR_AGENCY = [
  ["מעלים עובדים פעם אחת", "קובץ אקסל — המערכת בונה פרופיל לכל עובד, עם תאריכי התוקף של כל מסמך."],
  ["המערכת שומרת על התוקף", "אשרה, ביטוח, בטיחות וגובה. התראה 60 יום מראש, ובקשת חידוש לעובד בוואטסאפ."],
  ["ימים פנויים הופכים להכנסה", "המערכת מזהה ימים פנויים ומכינה הצעה לקבלנים במאגר שלכם. אתם רק מאשרים."],
  ["בקשה נכנסת, משבצים בלחיצה", "מקצוע, תאריך, אתר והעובדים שהקבלן בחר — עם בדיקת זמינות ואישורים אוטומטית."],
  ["דירוג אמינות", "הגעה, התאמה ושביעות רצון קובעים את המקום בחיפוש. תאגיד שמקיים — עולה."],
  ["דוח הצבות", "מי הוצב אצל איזה קבלן רשום, איפה ומתי — מוכן לייצוא לרשות האוכלוסין."],
];

const FAQ = [
  ["מי המעסיק של העובד?", "התאגיד. הוא נשאר המעסיק החוקי ומאשר כל הצבה. המערכת מוודאת שהתאגיד מורשה ושהמזמין קבלן רשום ברשם הקבלנים."],
  ["אפשר להזמין ליום אחד?", "כן, אצל תאגידים שמאפשרים זאת. כל תאגיד קובע משך הצבה מינימלי (יום, שבוע, שבועיים או חודש), והחיפוש מציג רק מה שמתאים."],
  ["איך משלמים?", "ישירות לתאגיד, בסוף העבודה, לפי השעות שאישרתם באפליקציה. הכסף של העסקה לא עובר דרכנו."],
  ["מה אם מגיע מישהו אחר?", "בבוקר אתם מסמנים “לא תואם” — לא משלמים על היום, התאגיד מקבל התראה להחלפה, וציון האמינות שלו יורד."],
  ["כמה זה עולה לקבלן?", "כלום. משלמים רק לתאגיד, לפי המחיר שראיתם מראש."],
];

export default async function Landing() {
  const u = await currentUser();
  return (
    <div>
      <section className="blueprint">
        <header className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-5 md:px-6">
          <Logo dark />
          <nav className="hidden items-center gap-6 text-[15px] font-semibold text-white/80 md:flex">
            <a href="#contractors" className="hover:text-white">לקבלנים</a>
            <a href="#agencies" className="hover:text-white">לתאגידים</a>
            <a href="#pricing" className="hover:text-white">איך משלמים</a>
          </nav>
          <div className="ms-auto flex gap-2">
            {u ? <Link href={homeFor(u.role)} className="btn-hazard btn-sm">לאזור שלי</Link> : <><Link href="/login" className="btn btn-sm border-[1.5px] border-white text-white hover:bg-white hover:text-ink">כניסה</Link><Link href="/signup" className="btn-hazard btn-sm hidden sm:inline-flex">הרשמה</Link></>}
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-6 md:grid-cols-[1.05fr_.95fr] md:px-6 md:pb-20 md:pt-10">
          <div>
            <div className="text-[13px] font-bold tracking-[.02em] text-hazard">גיליון 01 · עובדי בניין מתאגידים מורשים</div>
            <h1 className="mt-4 text-[48px] font-bold leading-[1.02] text-white md:text-[80px]">
              בונים על אנשים.<br /><em className="not-italic text-hazard">לא על הבטחות.</em>
            </h1>
            <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-[#c9d6e3] md:text-[20px]">כל עובד עם פרופיל, ותק, דירוג ואישורים בתוקף. מזמינים לפי מקצוע ויום, ורואים מראש בדיוק מי מגיע.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup?role=contractor" className="btn-hazard px-6 py-3.5 text-[17px]">אני קבלן — מזמין עובדים</Link>
              <Link href="/signup?role=agency" className="btn border-[1.5px] border-white px-6 py-3.5 text-[17px] text-white hover:bg-white hover:text-ink">אני תאגיד</Link>
            </div>
            <p className="mt-4 text-[14px] text-white/60">רוצים להסתכל קודם? <Link href="/login" className="font-bold text-white underline underline-offset-4">כניסה לחשבון הדגמה</Link></p>
          </div>

          {/* The hero shows the product promise itself: tomorrow's crew, named and priced, the evening before. */}
          <div className="relative mx-auto w-full max-w-[460px] pb-6">
            <div className="rounded-[3px] bg-white text-ink">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <div className="text-[13px] text-muted">מחר · נתניה, רחוב הרצל 12</div>
                  <div className="font-display text-[22px] font-bold">הצוות שלכם למחר</div>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-ink px-2.5 py-1 text-[13px] font-semibold text-white"><span className="h-2 w-2 rounded-full bg-signal" />ננעל ב-18:00</span>
              </div>
              {[
                { id: 3, n: "סרגיי ב.", t: "טפסן", tk: "formwork", y: 14, r: 4.9 },
                { id: 8, n: "ראג׳ש ק.", t: "טפסן", tk: "formwork", y: 9, r: 4.8 },
                { id: 20, n: "מיכאיל ד.", t: "ברזלן", tk: "rebar", y: 11, r: 4.7 },
              ].map((w) => (
                <div key={w.id} className="mx-5 flex items-center gap-3 border-b border-dashed border-line py-3">
                  <Avatar w={{ id: w.id, trade: w.tk }} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold">{w.n} <span className="text-[13px] font-normal text-muted">· {w.t} · {w.y} שנות ותק</span></div>
                    <div className="text-[12px] font-semibold text-ok">✓ אשרה · ✓ ביטוח · ✓ בטיחות · ✓ גובה</div>
                  </div>
                  <span className="num text-[14px] font-semibold">★ {w.r}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 text-[13px] text-muted">
                <span>איסוף 06:15 · נהג: אבי מ.</span>
                <span>לינה והסעה כלולים</span>
              </div>
              <div className="flex items-center justify-between bg-hazard px-5 py-3">
                <span className="text-[15px] font-semibold">מחיר סופי ליום</span>
                <span className="num font-display text-[24px] font-bold">₪1,962</span>
              </div>
            </div>
            <div className="absolute -bottom-1 start-6 flex items-center gap-2 border border-line bg-paper px-3 py-2 text-[13px] font-semibold text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ok text-[11px] text-white">✓</span>
              07:02 · כולם הגיעו ואושרו באתר
            </div>
          </div>
        </div>

        <div className="border-t border-white/20">
          <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
            {STATS.map(([n, l, s], i) => (
              <div key={l} className={`border-white/20 px-4 py-5 md:px-6 ${i % 2 === 0 ? "border-e" : ""} ${i < 2 ? "border-b md:border-b-0" : ""} md:border-e md:last:border-e-0`}>
                <div className={`font-display text-[30px] font-bold leading-none md:text-[40px] ${i === 3 ? "text-hazard" : "text-white"}`}>{n}</div>
                <div className="mt-1.5 text-[14px] font-semibold text-white">{l}</div>
                <div className="text-[13px] text-white/55">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contractors" className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[400px_1fr] md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-[400px] rounded-[40px] bg-ink p-2.5 shadow-[0_30px_60px_-30px_rgba(14,42,68,.6)]">
          <div className="overflow-hidden rounded-[31px] bg-paper">
            <div className="border-b border-line px-5 pb-3 pt-5">
              <div className="text-[12px] text-muted">נתניה · יום ד׳ · 9 שעות</div>
              <div className="font-display text-[30px] font-bold leading-tight text-ink">11 טפסנים פנויים</div>
            </div>
            {[
              { id: 3, n: "סרגיי ב.", y: 14, r: 4.9, p: 657, on: true },
              { id: 8, n: "ראג׳ש ק.", y: 9, r: 4.8, p: 639, on: true },
              { id: 13, n: "ואנג ל.", y: 12, r: 4.7, p: 666, on: false },
            ].map((w) => (
              <div key={w.id} className="mx-4 grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-dashed border-line py-3.5">
                <Avatar w={{ id: w.id, trade: "formwork" }} size={52} />
                <div><b className="text-[17px] text-ink">{w.n}</b> <span className="text-[12px] text-muted">· {w.y} שנה · ★ {w.r}</span>
                  <div className="mt-1 flex gap-2 text-[12px] font-bold text-ok"><span>✓ אשרה</span><span>✓ גובה</span><span>✓ בטיחות</span></div></div>
                <div className="text-left"><div className="num font-display text-[22px] font-bold text-ink">₪{w.p}</div>
                  <span className={`inline-block px-2.5 py-0.5 text-[12px] font-bold ${w.on ? "bg-ink text-white" : "border-[1.5px] border-ink text-ink"}`}>{w.on ? "נבחר" : "+ הוספה"}</span></div>
              </div>
            ))}
            <div className="m-4 flex items-center justify-between bg-ink px-4 py-3 text-[15px] text-white"><span><b>2 טפסנים</b> · <span className="num">₪1,296</span> ליום</span><span className="bg-hazard px-4 py-1.5 font-bold text-ink">המשך</span></div>
          </div>
        </div>

        <div className="self-center">
          <div className="eyebrow">לקבלן · ממשק הנייד</div>
          <h2 className="mt-2 text-[36px] font-bold leading-tight text-ink md:text-[52px]">חיפוש אחד במקום עשרות הודעות.</h2>
          <ol className="mt-8 border-t border-ink/15">
            {STEPS_C.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[56px_1fr] gap-4 border-b border-dashed border-line py-5">
                <span className="num font-display text-[34px] font-bold leading-none text-ink/30">{String(i + 1).padStart(2, "0")}</span>
                <div><h3 className="text-[20px] font-bold text-ink">{t}</h3><p className="mt-1 text-[15px] text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="agencies" className="blueprint">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="text-[13px] font-bold tracking-[.02em] text-hazard">גיליון 02 · לתאגיד</div>
          <h2 className="mt-2 text-[36px] font-bold leading-tight text-white md:text-[52px]">ימים פנויים הופכים להכנסה.</h2>
          <p className="mt-3 max-w-2xl text-[17px] text-[#c9d6e3]">כלי ניהול ושיווק למצבת העובדים: העובדים, האישורים והקבלנים שלכם, במקום אחד.</p>
          <div className="mt-10 grid border-s border-t border-white/20 sm:grid-cols-2 lg:grid-cols-3">
            {FOR_AGENCY.map(([t, d], i) => (
              <div key={t} className="relative border-b border-e border-white/20 p-6">
                <span className="absolute end-4 top-3 text-[11px] font-bold tracking-widest text-white/40">{String.fromCharCode(1488 + i)}</span>
                <h3 className="text-[21px] font-bold text-white">{t}</h3>
                <p className="mt-2 text-[15px] text-white/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="eyebrow">גיליון 03</div>
        <h2 className="mt-2 text-[36px] font-bold text-ink md:text-[48px]">איך משלמים</h2>
        <div className="mt-8 grid gap-0 border border-line bg-white md:grid-cols-2">
          <div className="border-b border-line p-7 md:border-b-0 md:border-e">
            <div className="eyebrow">קבלן</div>
            <div className="mt-2 font-display text-[32px] font-bold text-ink">משלמים רק לתאגיד</div>
            <p className="mt-2 text-[15px] text-muted">ישירות, לפי השעות שאישרתם, במחיר שראיתם מראש. מי שלא מתאים בבוקר, לא משלמים עליו.</p>
            <Link href="/login?intent=contractor" className="btn-primary mt-6">כניסה כקבלן</Link>
          </div>
          <div className="blueprint p-7">
            <div className="text-[12px] font-bold tracking-[.02em] text-hazard">תאגיד</div>
            <div className="mt-2 font-display text-[32px] font-bold text-white">תעריף קבוע לשעת עבודה</div>
            <ul className="mt-3 space-y-1.5 text-[15px] text-white/75">
              <li>— משלמים רק על שעות עבודה שהקבלן אישר. אין עבודה, אין תשלום.</li>
              <li>— בלי דמי מנוי ובלי התחייבות.</li>
              <li>— חיוב חודשי בהוראת קבע. הכסף של העסקה לא עובר דרכנו.</li>
            </ul>
            <Link href="/login?intent=agency" className="btn-hazard mt-6">כניסה כתאגיד</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        <h2 className="mb-5 text-[30px] font-bold text-ink">שאלות נפוצות</h2>
        <div className="border-t border-ink/15">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-dashed border-line py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[18px] font-bold text-ink">{q}<span className="font-display text-[24px] font-normal text-muted transition group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-[15px] text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="blueprint border-t-[3px] border-hazard">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-7 text-[14px] text-white/65 md:px-6">
          <Logo dark className="text-[22px]" />
          <span>התאגיד הוא המעסיק החוקי ומאשר כל הצבה · מוצג רק לקבלנים רשומים</span>
        </div>
      </footer>
    </div>
  );
}
