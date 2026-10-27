# הרצה מקומית ובדיקות

## דרישות
- Node.js מגרסה 20.9 ומעלה (מומלץ 22) ו-npm.
- זה הכול. אין צורך ב-Docker, ב-Postgres או בחשבון Supabase כדי לפתח ולבדוק.

## הפעלה (שתי פקודות)
```bash
npm install
npm run dev            # http://localhost:3000
```
מה קורה בהפעלה הראשונה:
- נוצר Postgres מוטמע (PGlite) בתיקייה `./data/pglite`.
- הסכמה מוחלת.
- נטענים נתוני הדגמה: 5 תאגידים, 107 עובדים, כ-1,000 הזמנות, 96 קבלנים במאגר ו-14 משתמשים בכל התפקידים.
- **מוד dev פעיל: אין התחברות.** נכנסים ישר ל-`/c` (קבלן), `/a` (תאגיד) או `/admin`.

## משתמשי ההדגמה (כפתור DEV)
בפינת המסך יש כפתור **DEV** שמחליף משתמש בלחיצה. כך בודקים הרשאות:

| משתמש | סוג · הרשאה | למה הוא טוב לבדיקה |
|---|---|---|
| יוסי לוי (`agency@demo.co.il`) | תאגיד · בעלים | הכול: חשבון, הגדרות, צוות |
| שירן אברהם (`agency-manager@`) | תאגיד · מנהל | שיבוץ, עובדים ושיווק, בלי חשבון, הגדרות וצוות |
| דנה כץ (`agency-viewer@`) | תאגיד · צפייה | רק צפייה. כפתורי עריכה מוסתרים, ופעולות נחסמות |
| משה כהן (`contractor@demo.co.il`) | קבלן · בעלים | צוות באתר היום וצוות מחר |
| אלי ביטון (`foreman@`) | קבלן · מנהל (מנהל עבודה) | הזמנות וצ'ק-אין, בלי ניהול צוות |
| מנהל מערכת (`admin@demo.co.il`) | אדמין · בעלים | אימות, משתמשים, יומן, כניסה בתור |
| משתמש חדש (`new@demo.co.il`) | ממתין לפרטים | בודק את דף הפרטים (קבלן או תאגיד) ואת ייבוא האקסל |

## ייבוא עובדים מאקסל
`/a/workers` ← "העלו קובץ אקסל של העובדים". יש תבנית בכתובת `/templates/workers.xlsx` (קובץ המקור: `public/templates/workers.xlsx`). הגיליון השני בקובץ מכיל הוראות.
- **כותרות:** בעברית או באנגלית (שם פרטי/first name, מקצוע/trade, ארץ/country, תוקף אשרה/visa…).
- **תאריכים:** בכל אחד מהפורמטים `31/12/2027`, `2027-12-31`, `12/2027`.
- **שורות חסרות:** שורה בלי שם, מקצוע או ארץ מדולגת. ההודעה מציינת כמה שורות נוספו וכמה דולגו.

## פקודות
| פקודה | מה היא עושה |
|---|---|
| `npm run dev` | שרת פיתוח, PGlite ומוד dev |
| `npm run typecheck` | TypeScript |
| `npm run build` ואז `npm start` | בנייה והרצה כמו בפרודקשן (מוד dev כבוי) |
| `npm run db:reset` | מחיקת ה-DB המקומי וההעלאות. בהפעלה הבאה נוצרים מחדש עם הדגמה |
| `npm run db:seed -- --force` | מחיקה וטעינה מחדש של נתוני ההדגמה (עובד גם מול Supabase) |
| `npm run db:migrate` | החלת הסכמה (מול `DATABASE_URL` אם הוגדר) |
| `npm run db:export-schema` | יצירת `supabase/migrations/0001_init.sql` מ-`lib/schema.ts` |
| `npm run test:e2e` | בדיקה מקצה לקצה של כל התפקידים (33 בדיקות) |
| `npm run test:hebrew` | סריקה של כל המסכים: נכשלת אם מופיע טקסט באנגלית (חוץ מכתובות אימייל) |

> **שימו לב:** נתוני ההדגמה נבנים יחסית לתאריך של היום, כמו "צוות באתר היום". אם עבר יום מאז ההפעלה, הריצו `npm run db:reset` לפני בדיקה.

## בדיקה מקצה לקצה
```bash
npm run db:reset && npm run dev          # טרמינל 1 (DB נקי)
npx playwright install chromium          # פעם אחת
npm run test:e2e                         # טרמינל 2
SHOTS=1 npm run test:e2e                 # עם צילומי מסך ל-tests/screenshots/
BASE_URL=http://localhost:3001 npm run test:e2e   # מול שרת אחר
```
הבדיקה עוברת על הזרימות האלה:
- הזמנה מהנייד, ואישור של מנהל בתאגיד.
- חסימות RBAC: צופה, מנהל ומנהל עבודה.
- צ'ק-אין עם עובד "לא תואם", אישור שעות ושמירת צוות.
- בקשת חידוש מסמך בוואטסאפ, ועדכון התוקף והסריקה בפרופיל העובד.
- ייבוא אקסל והדבקת קבלנים מוואטסאפ.
- הצעה לקבלנים: קישור וואטסאפ וקישור מעקב.
- דוח CSV.
- הזמנת חבר צוות.
- כניסה ראשונה של משתמש חדש כתאגיד וייבוא אקסל.
- אדמין: אימות, כניסה בתור ויומן פעולות.

**לפני כל הרצה צריך DB נקי.**

## הרצה מקומית מול Postgres אמיתי או Supabase
```bash
# Postgres מקומי (למשל docker run -p 5432:5432 -e POSTGRES_PASSWORD=pw postgres:16)
export DATABASE_URL=postgres://postgres:pw@localhost:5432/postgres
npm run db:seed -- --force    # מחיל סכמה ונתוני הדגמה
npm run dev                   # עדיין מוד dev, אבל על Postgres
```
אפשר להשתמש גם במחרוזת החיבור של פרויקט Supabase (Session pooler, פורט 5432) כדי לבדוק את הסביבה האמיתית מקומית.

## בדיקת התחברות Google מקומית
1. הגדירו פרויקט Supabase ו-Google OAuth לפי [`DEPLOY.md`](DEPLOY.md).
2. הוסיפו ל-Supabase ← Authentication ← URL Configuration ← Redirect URLs את הכתובת `http://localhost:3000/auth/callback`.
3. צרו קובץ `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ADMIN_EMAILS=you@gmail.com
   AUTH_DEV_BYPASS=0          # כדי לחייב התחברות גם ב-dev
   ```
4. `npm run dev` ואז `/login` ← "כניסה כתאגיד עם Google".

## תקלות נפוצות
| בעיה | פתרון |
|---|---|
| "Another next dev server is already running" | Next מאפשר שרת dev אחד לכל תיקייה. סגרו את השרת הקודם. |
| הנתונים "ישנים" (אין צוות היום) | `npm run db:reset` והפעלה מחדש |
| ‏PGlite נעול או נתקע אחרי קריסה | סגרו את השרת, ואז `npm run db:reset` |
| כפתור DEV לא מופיע | אתם ב-`npm start` (פרודקשן) או ש-`AUTH_DEV_BYPASS=0` |
