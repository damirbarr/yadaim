# Supabase: איך זה בנוי ואיך משנים

המטרה: כל שינוי בתשתית הוא קובץ אחד ופקודה אחת. אין קוד Supabase מפוזר בפרויקט.

## במה משתמשים ב-Supabase
| שירות | למה | איפה בקוד |
|---|---|---|
| **Postgres** | כל הנתונים | `lib/db.ts` מתחבר עם `DATABASE_URL` (בלי supabase-js) |
| **Auth** | התחברות עם Google בלבד (זיהוי). הסשן וההרשאות של האפליקציה עצמה | `lib/supabase.ts` ← `app/auth/*` |
| **Storage** | תמונות עובדים ומסמכים, בדלי פרטי | `lib/storage.ts` |

ארבעה קבצים מחזיקים את כל האינטגרציה:

| קובץ | תפקיד |
|---|---|
| `lib/config.ts` | **כל** משתני הסביבה במקום אחד, ומה מופעל (`features`) |
| `lib/supabase.ts` | המקום היחיד שיוצר קליינט של Supabase |
| `lib/migrations.ts` | מריץ את קבצי ה-SQL שב-`supabase/migrations/` |
| `lib/storage.ts` | ממשק קבצים (`FileStore`): Supabase Storage או דיסק מקומי |

בפיתוח מקומי אין צורך ב-Supabase בכלל: `npm run dev` מריץ Postgres מוטמע (PGlite) עם אותן מיגרציות בדיוק.

## שינוי במסד הנתונים (טבלה, עמודה, אינדקס)
```bash
npm run db:new -- add_latin_name
```
נוצר קובץ `supabase/migrations/<timestamp>_add_latin_name.sql`. כותבים בו SQL רגיל של Postgres:
```sql
alter table workers add column latin_name text;
```
זהו.
- **מקומית:** מפעילים מחדש את `npm run dev`, והמיגרציה רצה לבד.
- **ב-Supabase:** ‏`DATABASE_URL="…:5432/postgres" npm run db:migrate`, או `supabase db push`. שתי הדרכים רושמות את אותה טבלת מעקב (`supabase_migrations.schema_migrations`), אז אפשר לעבור ביניהן.
- **מה רץ כבר:** ‏`npm run db:status`.

כללים:
- כל קובץ רץ **פעם אחת**, בטרנזקציה, לפי סדר השמות.
- **לא עורכים** מיגרציה שכבר נדחפה ל-`main`. מתקנים בקובץ חדש.
- **RLS מופעל אוטומטית** על כל טבלה חדשה ב-`public` אחרי כל הרצה. ה-API הציבורי של Supabase לא חושף אותה, ולא צריך לזכור את זה.
- אחרי שינוי: לעדכן את הטיפוסים ב-`lib/queries.ts`, ואת `lib/seed.ts` אם רוצים נתוני הדגמה.

## הגדרה חדשה או אינטגרציה חדשה
1. מוסיפים את המשתנה ל-`lib/config.ts` (ול-`.env.example`).
2. קוראים אותו רק דרך `config.x.y`, ולא דרך `process.env` בקוד.
3. אם זו יכולת שאפשר להדליק ולכבות, מוסיפים לה שורה ב-`features`.

## שימוש בעוד יכולת של Supabase (Realtime, Edge Functions…)
מוסיפים ב-`lib/supabase.ts` פונקציה שמחזירה את הקליינט המתאים, ומשתמשים בה מהשרת. מפתח ה-`service_role` לא יוצא לדפדפן בשום מקרה.

## אחסון קבצים
`lib/storage.ts` מגדיר ממשק `FileStore` עם `put` ו-`get`. היום יש שני מימושים: Supabase Storage, אם מוגדר `SUPABASE_SERVICE_ROLE_KEY`, ודיסק מקומי. כדי לעבור לספק אחר (S3, R2) כותבים `FileStore` נוסף ומשנים שורה אחת ב-`store()`. הקבצים מוגשים תמיד דרך `/api/files/[name]` עם בדיקת הרשאות, והדלי נשאר פרטי.

## התחברות
Supabase משמש רק לזיהוי ב-Google. אחרי ההחזרה ל-`/auth/callback` האפליקציה פותחת סשן משלה ומשייכת את המשתמש (`lib/accounts.ts`). ספק נוסף, למשל Apple או קוד במייל:
1. מפעילים אותו ב-Supabase ← Authentication ← Providers.
2. מוסיפים כפתור שקורא ל-`signInWithOAuth` עם הספק הזה (ראו `app/auth/google/route.ts`). ה-callback לא משתנה.

**אדמין** נקבע רק ברשימה `ADMIN_EMAILS` שבהגדרות השרת. אין מסך שמעניק או מסיר הרשאת אדמין.

## משתני סביבה
| משתנה | מה | חובה בפרודקשן |
|---|---|---|
| `DATABASE_URL` | מחרוזת חיבור. ב-Vercel: ה-Transaction pooler (פורט 6543) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת הפרויקט | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח anon (להתחברות) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | מפתח שרת (לקבצים). סודי | ✅ |
| `SUPABASE_BUCKET` | שם הדלי (ברירת מחדל `uploads`) | |
| `APP_URL` | הכתובת הציבורית של האפליקציה | ✅ |
| `ADMIN_EMAILS` | המיילים של האדמינים, מופרדים בפסיק | ✅ |
| `DB_AUTO_MIGRATE` | ‏`1`: להריץ מיגרציות בעליית השרת (ברירת מחדל: רק ב-PGlite) | |
| `DB_POOL_MAX` | גודל מאגר החיבורים (ברירת מחדל 5) | |

ההקמה הראשונה של הפרויקט ב-Supabase, Google ו-Vercel מתוארת ב-[`DEPLOY.md`](DEPLOY.md).
