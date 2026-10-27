# דיפלוי: GitHub, Supabase, Google, Vercel

## דמו לשיתוף, בלי שום הגדרה (5 דקות)
לשיתוף מהיר של המערכת עם משקיעים, תאגידים או קבלנים, בלי Supabase ובלי Google:
1. ב-https://vercel.com לוחצים **Add New ← Project** ומייבאים את הריפו `damirbarr/yadaim`.
2. ב-**Environment Variables** מוסיפים משתנה אחד: `DEMO_MODE` = `1`.
3. **Deploy.** הכתובת שמתקבלת (למשל `https://yadaim.vercel.app`) היא הדמו.

מה מקבלים: כל המסכים עובדים, עם נתוני ההדגמה וכפתור "מצב פיתוח" להחלפה בין תאגיד, קבלן ואדמין. הנתונים נשמרים בזיכרון של השרת ומתאפסים מדי פעם (כשהשרת מופעל מחדש). לא להגדיר `DEMO_MODE` בפריסה אמיתית.

**צילום סטטי ב-GitHub Pages:** כל דחיפה ל-`main` מייצרת גם עותק לצפייה בלבד של כל המסכים בשלוש השפות (`.github/workflows/pages.yml`). הצילום נדחף לענף `gh-pages` (רק ה-workflow כותב אליו). כדי להפעיל: בריפו ב-GitHub, **Settings ← Pages ← Source: Deploy from a branch ← `gh-pages` / (root)**. בריפו פרטי זה דורש מנוי GitHub Pro. הכתובת: `https://damirbarr.github.io/yadaim/`.

## מה נפרס לאן
| רכיב | שירות | מה יש בו |
|---|---|---|
| **פרונטאנד ובקאנד** | **Vercel** | אפליקציית Next.js אחת: הדפים, ה-Server Actions (כל הפעולות) וה-API routes (`/auth/*`, `/api/*`, `/r/*`) |
| **מסד נתונים** | **Supabase Postgres** | כל הטבלאות (מיגרציות SQL ממוספרות ב-`supabase/migrations/`) |
| **התחברות** | **Supabase Auth** עם Google | זיהוי בלבד. ההרשאות (RBAC) מנוהלות באפליקציה |
| **קבצים** | **Supabase Storage** | תמונות עובדים ומסמכים, בדלי פרטי `uploads` |
| **קוד ו-CI** | **GitHub** | הריפו. ‏Vercel מושך ממנו בכל push, ו-Actions מריץ בדיקות |
| חלופה לשרת | Render / Railway / Fly.io | אותה אפליקציה כקונטיינר Docker (סעיף 7) |

> ב-Next.js הפרונטאנד והבקאנד הם פריסה אחת, ואין שרת API נפרד לנהל. אם בכל זאת רוצים שרת משלכם במקום Vercel, השתמשו ב-Docker (סעיף 7) והמשיכו להשתמש ב-Supabase.

סדר העבודה: GitHub, Supabase, Google, חזרה ל-Supabase, Vercel, בדיקה. בערך 30–45 דקות.

---

## 1. GitHub
1. צרו ריפו **ריק** ב-GitHub (למשל `yadaim`, Private), בלי README.
2. בתיקיית הפרויקט מהזיפ (הזיפ לא כולל היסטוריית git, כדי לחסוך במקום):
   ```bash
   git init -b main
   git add -A
   git commit -m "ידיים: גרסה ראשונה"
   git remote add origin https://github.com/<user>/yadaim.git
   git push -u origin main
   ```
3. ‏Actions יריץ את `.github/workflows/ci.yml` אוטומטית: typecheck, build ו-e2e.

## 2. Supabase: פרויקט, מסד נתונים ואחסון
1. ב-https://supabase.com צרו **New project**. בחרו אזור **Central EU (Frankfurt)**, הקרוב לישראל, ושמרו את סיסמת ה-DB.
2. **מפתחות:** ב-Project Settings ← API העתיקו:
   - `Project URL` למשתנה `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` למשתנה `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (סודי!) למשתנה `SUPABASE_SERVICE_ROLE_KEY`
3. **מחרוזות חיבור:** ב-Connect ← Connection string:
   - **Transaction pooler** (פורט **6543**) ל-`DATABASE_URL` ב-Vercel
   - **Session pooler** (פורט **5432**) למיגרציות מהמחשב
4. **יצירת הטבלאות.** אחת משלוש דרכים:
   - **מומלץ, מהמחשב** (עם מחרוזת ה-Session pooler):
     ```bash
     DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" npm run db:migrate
     ```
     הפקודה מריצה את קבצי `supabase/migrations/` שעוד לא רצו (הראשון: `20261027000000_init.sql`), רושמת אותם ב-`supabase_migrations.schema_migrations` ומפעילה RLS על כל טבלה. ‏`npm run db:status` מראה מה כבר רץ.
   - **Supabase CLI:** `supabase link --project-ref <ref>` ואז `supabase db push`. היא משתמשת באותה טבלת מעקב, אז אפשר לעבור בינה לבין `db:migrate`.
   - **ידנית:** SQL Editor ← הדביקו את קבצי המיגרציה לפי הסדר ← Run. הדבקה ידנית **לא נרשמת** בטבלת המעקב, ולכן `db:migrate` עלול לנסות להריץ אותם שוב. עדיף `db:migrate`.
5. **נתוני הדגמה (רשות, לסביבת דמו בלבד):**
   ```bash
   DATABASE_URL="...:5432/postgres" npm run db:seed
   ```
   בפרודקשן אמיתי לא מריצים seed. האדמין הראשון נכנס עם Google (סעיף 5).
6. **אחסון:** Storage ← New bucket ← שם `uploads`, **Private** (לא Public). האפליקציה ניגשת לדלי עם ה-service role, ומגישה את הקבצים דרך `/api/files` אחרי בדיקת הרשאות.

> **אבטחה:** המיגרציות מפעילות RLS על כל הטבלאות בלי policies. המשמעות היא שה-REST API הציבורי של Supabase, עם מפתח anon, לא חושף כלום. האפליקציה מתחברת ישירות ל-Postgres. **לא מכבים RLS.**

## 3. Google Cloud: לקוח OAuth
1. ב-https://console.cloud.google.com צרו פרויקט חדש (למשל "Yadaim").
2. **APIs & Services ← OAuth consent screen:**
   - User type: External
   - App name, Support email, ו-Authorized domains: הדומיין שלכם ו-`supabase.co`
   - Scopes: `email`, `profile`, `openid`
3. **Credentials ← Create credentials ← OAuth client ID ← Web application:**
   - **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`
   - העתיקו את ה-**Client ID** ואת ה-**Client secret**.
4. לפני השקה: OAuth consent screen ← **Publish app**. במצב Testing רק משתמשי בדיקה שהוגדרו יכולים להיכנס.

## 4. Supabase Auth: חיבור Google והגדרת כתובות
1. Authentication ← Providers ← **Google** ← Enable, והדביקו את ה-Client ID ואת ה-Client secret.
2. Authentication ← **URL Configuration:**
   - **Site URL:** `https://<your-app>.vercel.app` (או הדומיין שלכם)
   - **Redirect URLs** (הוסיפו את כולן):
     ```
     https://<your-app>.vercel.app/auth/callback
     https://<your-domain>/auth/callback
     http://localhost:3000/auth/callback
     https://*-<vercel-team>.vercel.app/auth/callback      # Preview deployments
     ```

## 5. Vercel: פריסת האפליקציה
1. ב-https://vercel.com לחצו **Add New ← Project**, ייבאו את ריפו ה-GitHub. ה-Framework יזוהה אוטומטית כ-Next.js.
2. **Settings ← Functions ← Region:** `fra1` (פרנקפורט, ליד ה-DB).
3. **Environment Variables** (Production, ואם רוצים גם Preview):

| משתנה | ערך | חובה |
|---|---|---|
| `DATABASE_URL` | מחרוזת ה-**Transaction pooler** (פורט 6543) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | ✅ (לקבצים) |
| `APP_URL` | `https://<your-app>.vercel.app` (בלי `/` בסוף) | ✅ |
| `ADMIN_EMAILS` | המייל שלכם (אפשר כמה, מופרדים בפסיק) | ✅ |
| `SUPABASE_BUCKET` | `uploads` | רשות |
| `AUTH_DEV_BYPASS` | **לא להגדיר בפרודקשן.** ‏`1` רק לסביבת דמו בלי התחברות | ⚠️ |
| `DB_POOL_MAX` | ‏`5` (ברירת מחדל) | רשות |

4. **Deploy.**
5. אחרי הפריסה הראשונה בדקו ש-`APP_URL` וה-Redirect URLs ב-Supabase תואמים לכתובת האמיתית.
6. **דומיין:** Settings ← Domains. אחרי ההוספה עדכנו את `APP_URL`, את ה-Site URL ואת ה-Redirect URLs ב-Supabase, ואת ה-Authorized domains ב-Google.

> **מיגרציות בכל פריסה (רשות):** אפשר להגדיר ב-Vercel ← Settings ← Build Command את הפקודה `npm run db:migrate && npm run build`. כל מיגרציה רצה פעם אחת בלבד (המעקב ב-`supabase_migrations.schema_migrations`), ולכן בטוח להריץ את הפקודה בכל פריסה.

## 6. בדיקה אחרי פריסה
- [ ] `https://<app>/login` מציג "כניסה כקבלן / כתאגיד עם Google", ואין כפתור DEV.
- [ ] כניסה עם המייל שמופיע ב-`ADMIN_EMAILS` מובילה ל-`/admin`. משתמש אחר שפותח `/admin` מקבל 404.
- [ ] משתמש Google אחר מגיע ל-`/onboarding`. אחרי בחירת "תאגיד" הוא נכנס ל-`/a/workers?welcome=1`, ושם ייבוא `workers.xlsx` מצליח.
- [ ] האדמין מאמת את התאגיד ב-`/admin`, והתאגיד מופיע בחיפוש של קבלן.
- [ ] העלאת תמונה לעובד, והתמונה מוצגת. הקובץ מופיע ב-Storage ← uploads.
- [ ] הזמנת חבר צוות ב-`/a/team`. הוא נכנס עם Google ומקבל את התפקיד הנכון.
- [ ] ‏`/admin/audit` מציג את הכניסות ואת הפעולות.

## 7. חלופה: שרת משלכם עם Docker (Render, Railway, Fly.io)
אותה אפליקציה (פרונט ובקאנד) בקונטיינר אחד. משתמשים באותו Supabase.
```bash
docker build -t yadaim .
docker run -p 3000:3000 \
  -e DATABASE_URL=... -e NEXT_PUBLIC_SUPABASE_URL=... -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... -e APP_URL=https://yadaim.example.com -e ADMIN_EMAILS=you@x.com yadaim
```
- **Render:** New ← Web Service ← הריפו ← Runtime: Docker. הוסיפו את המשתנים.
- **Railway:** New Project ← Deploy from GitHub. ה-Dockerfile מזוהה אוטומטית.
- **Fly.io:** ‏`fly launch` ואז `fly secrets set ...`.

> שימו לב: משתני `NEXT_PUBLIC_*` נקראים בצד השרת בזמן ריצה ולכן עובדים גם בקונטיינר. האפליקציה לא משתמשת בהם בדפדפן.

## 8. עלויות (נכון לכתיבה, כדאי לבדוק)
- **Supabase Free:** ‏500MB DB ו-1GB קבצים. פרויקט נעצר אחרי שבוע בלי פעילות. לפיילוט אמיתי מומלץ Pro (כ-$25 לחודש).
- **Vercel Hobby:** מיועד לשימוש לא מסחרי. לשימוש עסקי צריך Pro (כ-$20 למשתמש לחודש).
- **Google OAuth:** חינם.

## 9. עדכוני סכמה בהמשך
1. ‏`npm run db:new -- <name>` יוצר קובץ חדש ב-`supabase/migrations/`. כותבים בו SQL רגיל של Postgres, למשל `alter table workers add column latin_name text;`, ושומרים אותו ב-commit.
2. מקומית, `npm run dev` מחיל אותו לבד. מול Supabase מריצים `npm run db:migrate` (או `supabase db push`), או נותנים ל-Build Command לעשות את זה.
3. לא עורכים מיגרציה שכבר נדחפה ל-`main`. מתקנים בקובץ חדש.
4. לא מוחקים ולא משנים עמודות קיימות בלי תוכנית מעבר. מוסיפים חדש ואז מעבירים.

הפירוט המלא: [`SUPABASE.md`](SUPABASE.md).
