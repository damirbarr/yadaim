import { randomToken } from "./tokens";
import { addDays, endOfBlock, isWorkday, todayISO, nextWorkday, COUNTRIES, REGIONS, TRADES, trade, hourlyFor } from "./domain";

// i18n-data-file: demo data (names, companies, addresses) is Hebrew on purpose, like real entered data.

// Deterministic PRNG so the demo looks the same on every fresh install.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: Record<string, [string, string][]> = {
  IN: [["ראג'ש", "קומאר"], ["סורש", "פאטל"], ["אמיט", "סינג"], ["ויקראם", "יאדב"], ["מאנוג'", "שארמה"], ["דיפאק", "ורמה"], ["ראווי", "גופטה"], ["סוניל", "רדי"], ["ארון", "נאיר"], ["סנג'אי", "מישרה"], ["ראהול", "ג'ושי"], ["פראדיפ", "דאס"], ["גורפריט", "סינג"], ["אניל", "קומאר"]],
  LK: [["נואן", "פררה"], ["קסון", "סילבה"], ["צ'מינדה", "פרננדו"], ["רואן", "ג'איסינגה"], ["דינש", "קומארה"], ["לאהירו", "בנדרה"]],
  MD: [["סרגיי", "בירקה"], ["יון", "פופסקו"], ["ואסילה", "רוסו"], ["אנדריי", "צ'בן"], ["דומיטרו", "לונגו"], ["אלכסנדרו", "מוראר"], ["ויקטור", "קיריאק"], ["ניקולאי", "בודו"], ["קוסטל", "פרונזה"], ["ראדו", "קאזאקו"]],
  UZ: [["בהודיר", "טורסונוב"], ["שרזוד", "קרימוב"], ["אקמל", "רחימוב"], ["ג'סור", "אלייב"], ["אולוגבק", "נזרוב"], ["רוסטם", "יוסופוב"]],
  CN: [["ואנג", "לי"], ["ג'אנג", "ויי"], ["ליו", "יאנג"], ["צ'ן", "ג'ון"], ["האו", "מינג"], ["ג'ואו", "פנג"]],
  BY: [["אלכסנדר", "נוביק"], ["דמיטרי", "קובלב"]],
};
// All-in hourly price incl. agency lodging (research: ₪13–17k/month ÷ 211h ≈ ₪62–81/h).
const BASE_RATE: Record<string, number> = { formwork: 76, rebar: 75, plaster: 72, tiling: 78, masonry: 70 };
const SKILLS: Record<string, string[]> = {
  formwork: ["טפסנות קירות", "תקרות", "עמודים", "טפסות מתועשות"],
  rebar: ["קשירת רשתות", "כיפוף וחיתוך", "קריאת תכניות"],
  plaster: ["טיח פנים", "טיח חוץ", "שליכט"],
  tiling: ["ריצוף פורצלן", "חיפוי קירות", "פורמטים גדולים"],
  masonry: ["בלוקים", "קירות תומכים", "יציקות", "עבודות שלד"],
};

type Plan = { country: string; trade: string }[];
type Query = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

/** Rows are built in memory with explicit ids, then bulk-inserted (fast on PGlite and over the network to Supabase). */
class Table {
  rows: unknown[][] = [];
  constructor(public name: string, public cols: string[]) {}
  add(...values: unknown[]) {
    const id = this.rows.length + 1;
    this.rows.push([id, ...values]);
    return id;
  }
  col(id: number, c: string) {
    return this.rows[id - 1][this.cols.indexOf(c) + 1];
  }
  async flush(q: Query) {
    const cols = ["id", ...this.cols];
    for (let i = 0; i < this.rows.length; i += 200) {
      const chunk = this.rows.slice(i, i + 200);
      const ph = chunk.map((r, j) => `(${r.map((_, k) => `$${j * cols.length + k + 1}`).join(",")})`).join(",");
      await q(`insert into ${this.name} (${cols.join(",")}) values ${ph}`, chunk.flat().map((v) => (v === undefined ? null : v)));
    }
    if (this.rows.length) await q(`select setval(pg_get_serial_sequence('${this.name}', 'id'), (select max(id) from ${this.name}))`, []);
  }
}

export async function seed(q: Query) {
  const r = rng(20261024);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const between = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const today = todayISO();

  const T = {
    agencies: new Table("agencies", ["name", "slug", "license_no", "verified", "city", "regions", "phone", "about", "lodging_discount", "transport_rate", "min_days"]),
    contractors: new Table("contractors", ["company", "registry_no", "verified", "contact_name", "phone", "city", "classification"]),
    users: new Table("users", ["email", "name", "role", "org_role", "agency_id", "contractor_id"]),
    invites: new Table("invites", ["email", "role", "org_role", "agency_id", "contractor_id", "invited_by"]),
    workers: new Table("workers", ["agency_id", "first_name", "last_name", "trade", "years", "country", "lang", "phone", "passport_no", "hourly_rate", "token", "skills"]),
    documents: new Table("documents", ["worker_id", "type", "number", "expires", "status", "verified_at"]),
    bookings: new Table("bookings", ["contractor_id", "agency_id", "trade", "date", "end_date", "days", "start_time", "hours", "city", "address", "lodging", "transport", "status", "pickup_time", "driver_name", "vehicle_no", "created_at", "approved_at", "completed_at"]),
    bw: new Table("booking_workers", ["booking_id", "worker_id", "hourly_rate", "arrived", "identity_ok", "trade_ok", "checkin_at", "hours_approved", "rating", "tags", "review"]),
    contacts: new Table("crm_contacts", ["agency_id", "name", "company", "phone", "city", "region", "trades", "source", "opted_out", "last_sent_at"]),
    campaigns: new Table("campaigns", ["agency_id", "trade", "date_from", "date_to", "idle_days", "message", "status", "created_at", "sent_at"]),
    recipients: new Table("campaign_recipients", ["campaign_id", "contact_id", "ref", "sent_at", "opened_at", "booked_at"]),
    events: new Table("events", ["agency_id", "contractor_id", "booking_id", "kind", "msg", "params", "created_at"]),
    audit: new Table("audit_log", ["actor_id", "impersonator_id", "action", "target", "details", "created_at"]),
  };
  {
    // ── Agencies ───────────────────────────────────────────────────
    const agencies = [
      ["בנייה הצפון כוח אדם בע\"מ", "bniya-hatzafon", "ת-2023-0412", 1, "חדרה", "sharon,north,center", "04-6331200", "תאגיד בנייה מורשה מ-2023. מתמחים בטפסנות וברזלנות, הסעות מחדרה, נתניה וחיפה.", 8, 6],
      ["אסיה כוח אדם ובנייה", "asia-koach-adam", "ת-2024-0877", 1, "ראשון לציון", "center,south,sharon", "03-9512277", "עובדים מהודו וסרי לנקה. ריצוף, טיח וגבס.", 9, 6],
      ["גשר תאגיד בנייה", "gesher", "ת-2024-1130", 1, "ירושלים", "jerusalem,center", "02-6250014", "צוותי שלד וטפסנות לירושלים והמרכז.", 7, 7],
      ["מזרח-מערב השמה", "mizrach-maarav", "ת-2025-0219", 1, "אשדוד", "south,center", "08-8564410", "עובדים מאוזבקיסטן ומולדובה לדרום.", 8, 5],
      ["אופק כוח אדם", "ofek", "ת-2026-0091", 0, "פתח תקווה", "center", "03-9300100", "תאגיד חדש, ממתין לאימות רישיון.", 8, 6],
    ] as const;
    const minDays = [1, 1, 5, 1, 1];
    const agencyIds = agencies.map((a, i) => T.agencies.add(...a, minDays[i]));

    // ── Contractors ────────────────────────────────────────────────
    const contractors = [
      ["משה כהן · שלד בע\"מ", "31847", 1, "משה כהן", "052-4418820", "נתניה", "100 ג-3"],
      ["א.ב. יזמות ובנייה", "29011", 1, "אבי ברק", "054-7710233", "תל אביב", "100 ג-5"],
      ["שיפוצי הגליל", "40552", 1, "נאסר חורי", "050-2297741", "חיפה", "131 ב-1"],
      ["ר.ש. קבלנות", "44120", 0, "רונן שמש", "053-6612098", "אשדוד", "100 ג-1"],
    ] as const;
    const contrIds = contractors.map((c) => T.contractors.add(...c));

    // ── Users ──────────────────────────────────────────────────────
    // Demo accounts cover every role so RBAC can be tried in dev mode (see lib/rbac.ts).
    const U = (email: string, name: string, role: string, orgRole: string, agency: number | null, contractor: number | null) => T.users.add(email, name, role, orgRole, agency, contractor);
    const yossi = U("agency@demo.co.il", "יוסי לוי", "agency", "owner", agencyIds[0], null);
    U("agency-manager@demo.co.il", "שירן אברהם", "agency", "manager", agencyIds[0], null);
    U("agency-viewer@demo.co.il", "דנה כץ", "agency", "viewer", agencyIds[0], null);
    U("asia@demo.co.il", "רינה אזולאי", "agency", "owner", agencyIds[1], null);
    U("gesher@demo.co.il", "דוד מזרחי", "agency", "owner", agencyIds[2], null);
    U("east@demo.co.il", "אלנה גרין", "agency", "owner", agencyIds[3], null);
    U("ofek@demo.co.il", "עמית רז", "agency", "owner", agencyIds[4], null);
    U("contractor@demo.co.il", "משה כהן", "contractor", "owner", null, contrIds[0]);
    U("foreman@demo.co.il", "אלי ביטון", "contractor", "manager", null, contrIds[0]);
    U("avi@demo.co.il", "אבי ברק", "contractor", "owner", null, contrIds[1]);
    U("naser@demo.co.il", "נאסר חורי", "contractor", "owner", null, contrIds[2]);
    U("ronen@demo.co.il", "רונן שמש", "contractor", "owner", null, contrIds[3]);
    const admin = U("admin@demo.co.il", "מנהל מערכת", "admin", "owner", null, null);
    U("new@demo.co.il", "משתמש חדש", "pending", "owner", null, null);
    T.invites.add("office@bniya-hatzafon.co.il", "agency", "manager", agencyIds[0], null, yossi);

    // ── Workers + documents ───────────────────────────────────────
    const plans: Plan[] = [
      // Main demo agency: 42 workers, heavy on formwork/rebar
      [
        ...Array(4).fill({ country: "MD", trade: "formwork" }),
        ...Array(6).fill({ country: "IN", trade: "formwork" }),
        ...Array(3).fill({ country: "CN", trade: "formwork" }),
        ...Array(6).fill({ country: "IN", trade: "rebar" }),
        ...Array(2).fill({ country: "MD", trade: "rebar" }),
        ...Array(4).fill({ country: "UZ", trade: "plaster" }),
        ...Array(3).fill({ country: "LK", trade: "tiling" }),
        ...Array(2).fill({ country: "CN", trade: "tiling" }),
        ...Array(4).fill({ country: "IN", trade: "masonry" }),
        ...Array(3).fill({ country: "LK", trade: "masonry" }),
        ...Array(3).fill({ country: "UZ", trade: "masonry" }),
        ...Array(2).fill({ country: "BY", trade: "formwork" }),
      ],
      [
        ...Array(6).fill({ country: "IN", trade: "tiling" }),
        ...Array(5).fill({ country: "LK", trade: "plaster" }),
        ...Array(5).fill({ country: "IN", trade: "masonry" }),
        ...Array(5).fill({ country: "IN", trade: "formwork" }),
        ...Array(4).fill({ country: "LK", trade: "masonry" }),
      ],
      [
        ...Array(6).fill({ country: "CN", trade: "formwork" }),
        ...Array(5).fill({ country: "MD", trade: "rebar" }),
        ...Array(4).fill({ country: "MD", trade: "masonry" }),
        ...Array(3).fill({ country: "IN", trade: "masonry" }),
      ],
      [
        ...Array(5).fill({ country: "UZ", trade: "formwork" }),
        ...Array(4).fill({ country: "UZ", trade: "plaster" }),
        ...Array(4).fill({ country: "MD", trade: "tiling" }),
        ...Array(3).fill({ country: "UZ", trade: "masonry" }),
      ],
      [...Array(6).fill({ country: "IN", trade: "masonry" })],
    ];
    const usedNames = new Set<string>();
    const workersByAgency: number[][] = [];
    const workerTrade = new Map<number, string>();
    const workerRate = new Map<number, number>();

    plans.forEach((plan, ai) => {
      const ids: number[] = [];
      plan.forEach((p, i) => {
        let first = "", last = "";
        for (let k = 0; k < 50; k++) {
          [first, last] = pick(NAMES[p.country]);
          if (!usedNames.has(first + last)) break;
        }
        usedNames.add(first + last);
        const years = between(3, 16);
        const rate = BASE_RATE[p.trade] + between(-4, 4) + (years > 12 ? 3 : 0);
        const sk = SKILLS[p.trade].filter(() => r() > 0.4).join(",") || SKILLS[p.trade][0];
        const id = T.workers.add(agencyIds[ai], first, last, p.trade, years, p.country, COUNTRIES[p.country].lang,
          `05${between(0, 8)}-${between(100, 999)}${between(1000, 9999)}`, `${p.country}${between(1000000, 9999999)}`, rate, randomToken(9), sk);
        ids.push(id);
        workerTrade.set(id, p.trade);
        workerRate.set(id, rate);

        // Document expiries: mostly comfortable, a handful about to lapse for the compliance demo.
        const exp = (minD: number, maxD: number) => addDays(today, between(minD, maxD));
        let visa = exp(150, 720), insurance = exp(60, 330);
        exp(90, 420); // was the safety-document expiry; kept so the random sequence (and the demo) stays the same
        let heights = exp(90, 600);
        if (ai === 0) {
          if (i === 7) insurance = addDays(today, -6); // expired
          if (i === 14) visa = addDays(today, 9);
          if (i === 30) insurance = addDays(today, 12);
          if (i === 22) heights = addDays(today, 41);
          if (i === 35) visa = addDays(today, 53);
        } else if (r() < 0.06) visa = addDays(today, between(-10, 25));
        const verified = addDays(today, -between(10, 200));
        T.documents.add(id, "passport", `${p.country}${between(1000000, 9999999)}`, exp(700, 2400), "verified", verified);
        T.documents.add(id, "visa", `B1-${between(100000, 999999)}`, visa, "verified", verified);
        T.documents.add(id, "insurance", `POL-${between(10000, 99999)}`, insurance, "verified", verified);
        if (trade(p.trade).heights && !(ai === 0 && i === 41)) T.documents.add(id, "heights", null, heights, "verified", verified);
      });
      workersByAgency.push(ids);
    });

    // ── Booking history (past 5 weeks) → ratings, reliability, utilization ──
    const insBooking = { run: (...v: unknown[]) => T.bookings.add(...v) };
    const insBW = { run: (...v: unknown[]) => T.bw.add(...v) };
    const sites = [
      ["נתניה", "רח' הרצל 12, נתניה"], ["נתניה", "שד' בן גוריון 40, נתניה"], ["חדרה", "רח' הנשיא 8, חדרה"],
      ["תל אביב", "רח' יגאל אלון 94, תל אביב"], ["חיפה", "שד' מוריה 120, חיפה"], ["פתח תקווה", "רח' ז'בוטינסקי 3, פתח תקווה"],
      ["אשדוד", "רובע ט\"ו, אשדוד"], ["ירושלים", "רח' יפו 210, ירושלים"], ["ראשון לציון", "רח' רוטשילד 50, ראשון לציון"],
    ];
    const reviews = ["עבודה נקייה, הגיע בזמן", "מזמין שוב", "מקצוען אמיתי", "עבד מהר ומדויק", "בסדר גמור", "טוב, צריך קצת הכוונה"];
    const drivers = ["סאלח", "אליאס", "ויקטור", "חיים", "מוחמד"];
    // Utilization targets per agency per week (oldest → newest)
    const util = [[0.74, 0.79, 0.86, 0.92], [0.7, 0.72, 0.75, 0.78], [0.8, 0.82, 0.79, 0.81], [0.62, 0.58, 0.55, 0.6], [0, 0, 0, 0]];
    const reliab = [0.97, 0.93, 0.95, 0.78, 1];

    for (let back = 28; back >= 1; back--) {
      const date = addDays(today, -back);
      if (!isWorkday(date)) continue;
      const week = 3 - Math.min(3, Math.floor((back - 1) / 7));
      workersByAgency.forEach((ids, ai) => {
        if (ai === 4) return;
        const busy = ids.filter(() => r() < util[ai][week]);
        // Group busy workers by trade into bookings of 1–4 workers
        const byTrade = new Map<string, number[]>();
        busy.forEach((w) => byTrade.set(workerTrade.get(w)!, [...(byTrade.get(workerTrade.get(w)!) ?? []), w]));
        for (const [tk, ws] of byTrade) {
          while (ws.length) {
            const group = ws.splice(0, between(1, 4));
            const contr = ai === 0 && r() < 0.07 ? contrIds[0] : pick(contrIds.slice(1, 3));
            const [city, address] = pick(sites);
            const lodging = r() < 0.6 ? "contractor" : "agency";
            const created = addDays(date, -between(2, 6)) + " 10:12:00";
            const bid = Number(insBooking.run(contr, agencyIds[ai], tk, date, date, 1, "07:00", 9, city, address, lodging, "agency",
              "completed", "06:15", pick(drivers), `${between(10, 99)}-${between(100, 999)}-${between(10, 99)}`, created, created, date + " 16:30:00"));
            const a = { lodging_discount: agencies[ai][8], transport_rate: agencies[ai][9] };
            for (const w of group) {
              const ok = r() < reliab[ai];
              const partial = !ok && r() < 0.5;
              const rating = ok ? (r() < 0.7 ? 5 : 4) : partial ? 3 : null;
              insBW.run(bid, w, hourlyFor(workerRate.get(w)!, a, { lodging, transport: "agency" }),
                ok || partial ? 1 : 0, ok ? "yes" : partial ? "partial" : "no", ok ? "yes" : partial ? "partial" : "no",
                ok || partial ? date + " 06:4" + between(0, 9) + ":00" : null,
                ok || partial ? 9 : 0, rating, ok ? pick(["עבודה נקייה", "דייק בזמנים", "עובד מהר"]) : null, ok && r() < 0.4 ? pick(reviews) : null);
            }
          }
        }
      });
    }

    // ── Upcoming bookings ─────────────────────────────────────────
    const A0 = agencyIds[0];
    const a0 = { lodging_discount: 8, transport_rate: 6 };
    const formworkA0 = workersByAgency[0].filter((w) => workerTrade.get(w) === "formwork");
    const tomorrow = nextWorkday(today);
    // Demo contractor: approved crew for tomorrow (shows evening-before lock)
    let bid = Number(insBooking.run(contrIds[0], A0, "formwork", tomorrow, tomorrow, 1, "07:00", 9, "נתניה", "רח' הרצל 12, נתניה", "contractor", "agency",
      "approved", "06:15", "סאלח", "21-458-63", today + " 08:30:00", today + " 09:02:00", null));
    for (const w of formworkA0.slice(0, 2)) insBW.run(bid, w, hourlyFor(workerRate.get(w)!, a0, { lodging: "contractor", transport: "agency" }), null, null, null, null, null, null, null, null);
    // Demo contractor: crew on site today (check-in + end-of-day demo)
    if (isWorkday(today)) {
      bid = Number(insBooking.run(contrIds[0], A0, "rebar", today, today, 1, "07:00", 9, "נתניה", "שד' בן גוריון 40, נתניה", "agency", "agency",
        "approved", "06:15", "אליאס", "34-221-90", addDays(today, -3) + " 12:00:00", addDays(today, -3) + " 12:40:00", null));
      const rebar = workersByAgency[0].filter((w) => workerTrade.get(w) === "rebar");
      for (const w of rebar.slice(0, 3)) insBW.run(bid, w, hourlyFor(workerRate.get(w)!, a0, { lodging: "agency", transport: "agency" }), null, null, null, null, null, null, null, null);
    }
    // Incoming requests for the demo agency
    const req = (contr: number, tk: string, inDays: number, n: number, city: string, address: string, len = 1) => {
      const date = (() => { let d = addDays(today, inDays); while (!isWorkday(d)) d = addDays(d, 1); return d; })();
      const b = Number(insBooking.run(contr, A0, tk, date, endOfBlock(date, len), len, "07:00", 9, city, address, "contractor", "agency", "requested", null, null, null,
        today + " 07:4" + between(0, 9) + ":00", null, null));
      const pool = workersByAgency[0].filter((w) => workerTrade.get(w) === tk);
      for (const w of pool.slice(2, 2 + n)) insBW.run(b, w, hourlyFor(workerRate.get(w)!, a0, { lodging: "contractor", transport: "agency" }), null, null, null, null, null, null, null, null);
    };
    req(contrIds[1], "formwork", 3, 2, "תל אביב", "רח' יגאל אלון 94, תל אביב", 5);
    req(contrIds[2], "rebar", 2, 3, "חיפה", "שד' מוריה 120, חיפה");

    // ── Future demand from other contractors (keeps utilization realistic, leaves formwork idle for the campaign demo) ──
    const reserved = new Set(T.bw.rows.filter((row) => String(T.bookings.col(row[1] as number, "date")) >= today).map((row) => row[2] as number));
    const futureUtil = (ai: number, tk: string) => (ai === 0 ? (tk === "formwork" ? 0.35 : 0.8) : ai === 4 ? 0 : 0.7);
    let d = nextWorkday(tomorrow);
    for (let k = 0; k < 10; k++, d = nextWorkday(d)) {
      workersByAgency.forEach((ids, ai) => {
        const byTrade = new Map<string, number[]>();
        ids.filter((w) => !reserved.has(w) && r() < futureUtil(ai, workerTrade.get(w)!)).forEach((w) => byTrade.set(workerTrade.get(w)!, [...(byTrade.get(workerTrade.get(w)!) ?? []), w]));
        const a = { lodging_discount: agencies[ai][8], transport_rate: agencies[ai][9] };
        for (const [tk, ws] of byTrade) {
          while (ws.length) {
            const group = ws.splice(0, between(2, 4));
            const [city, address] = pick(sites);
            const bid = Number(insBooking.run(pick(contrIds.slice(1, 3)), agencyIds[ai], tk, d, d, 1, "07:00", 9, city, address, "contractor", "agency",
              "approved", "06:15", pick(drivers), `${between(10, 99)}-${between(100, 999)}-${between(10, 99)}`, addDays(today, -2) + " 11:00:00", addDays(today, -2) + " 11:30:00", null));
            for (const w of group) insBW.run(bid, w, hourlyFor(workerRate.get(w)!, a, { lodging: "contractor", transport: "agency" }), null, null, null, null, null, null, null, null);
          }
        }
      });
    }

    // ── CRM contacts ──────────────────────────────────────────────
    const phones = new Set<string>();
    const fn = ["משה", "אבי", "יוסי", "דני", "רוני", "איתן", "שמעון", "חיים", "עמיר", "נאסר", "ג'מאל", "אלי", "גיל", "עוזי", "בני", "קובי", "שלומי", "יגאל"];
    const ln = ["כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "פרידמן", "דהן", "אזולאי", "חורי", "עזאם", "שפירא", "גבאי", "אוחיון"];
    const co = ["בנייה", "יזמות", "שיפוצים", "קבלנות", "הנדסה", "פרויקטים"];
    const sources = ["whatsapp", "phone", "csv"];
    for (let i = 0; i < 96; i++) {
      const reg = pick(REGIONS.filter((x) => ["sharon", "north", "center"].includes(x.key)));
      const city = pick(reg.cities);
      const name = `${pick(fn)} ${pick(ln)}`;
      const phone = `05${between(0, 8)}-${between(1000000, 9999999)}`;
      if (phones.has(phone)) continue;
      phones.add(phone);
      T.contacts.add(A0, name, `${name.split(" ")[1]} ${pick(co)}`, phone, city, reg.key,
        TRADES.filter(() => r() < 0.3).map((t) => t.key).join(",") || "formwork", pick(sources), r() < 0.04 ? 1 : 0, r() < 0.2 ? addDays(today, -between(1, 20)) : null);
    }

    // ── A past campaign with results ──────────────────────────────
    const camp = T.campaigns.add(
      A0, "rebar", addDays(today, -12), addDays(today, -5), 14,
      "היי, יש לנו ברזלנים פנויים השבוע. כולם עם אישורים בתוקף. אפשר להזמין גם ליום אחד:", "sent", addDays(today, -13) + " 09:00:00", addDays(today, -13) + " 09:05:00");
    const contacts = T.contacts.rows.filter((row) => row[9] === 0).slice(0, 40).map((row) => ({ id: row[0] as number }));
    contacts.forEach((c, i) => T.recipients.add(camp, c.id, randomToken(6), addDays(today, -13), i < 26 ? addDays(today, -13) : null, i < 3 ? addDays(today, -12) : null));

    const ev = { run: (...v: unknown[]) => T.events.add(...v) };
    // Feed entries are message keys + params (lib/events.ts), rendered in the reader's language.
    ev.run(A0, null, null, "info", "setup", "{}", addDays(today, -30) + " 08:00:00");
    ev.run(A0, null, null, "campaign", "campaign", JSON.stringify({ trade: "rebar", n: 40, opened: 26, booked: 3 }), addDays(today, -13) + " 09:05:00");
    const reqs = T.bookings.rows.filter((row) => row[2] === A0 && row[13] === "requested").map((row) => ({
      id: row[0] as number, date: row[4] as string, days: row[6] as number, trade: row[3] as string, city: row[9] as string,
      company: T.contractors.col(row[1] as number, "company") as string, n: T.bw.rows.filter((x) => x[1] === row[0]).length,
    }));
    for (const q of reqs) ev.run(A0, null, q.id, "request", q.days > 1 ? "requestDays" : "request", JSON.stringify({ company: q.company, n: q.n, trade: q.trade, date: q.date, city: q.city, days: q.days }), today + " 07:45:00");
    T.audit.add(admin, null, "org.verify", "agency:1", null, addDays(today, -60) + " 10:00:00");
    T.audit.add(yossi, null, "workers.import", "agency:1", "workers.xlsx: 42 added, 0 skipped", addDays(today, -59) + " 11:20:00");
    T.audit.add(yossi, null, "team.invite", "office@bniya-hatzafon.co.il", "manager", addDays(today, -2) + " 09:10:00");
  }
  // FK order
  for (const t of [T.agencies, T.contractors, T.users, T.invites, T.workers, T.documents, T.bookings, T.bw, T.contacts, T.campaigns, T.recipients, T.events, T.audit]) await t.flush(q);
  // Agency crews and site safety briefings live in their own modules; they read the rows flushed above.
  const { seedCrews } = await import("./seed-crews");
  await seedCrews(q);
  const { seedBriefings } = await import("./seed-briefings");
  await seedBriefings(q);
  const { seedAttendance } = await import("./seed-attendance");
  await seedAttendance(q);
  const { seedPromotions } = await import("./seed-promotions");
  await seedPromotions(q);
}
