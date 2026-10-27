// Static domain knowledge: trades, regions, documents, pricing rules.
// Display names for everything here are in messages/<locale>/domain.ts (shown via fmt.trade(), fmt.region() …).

// Trades open to foreign workers in the construction branch (procedure 9.4.0001). Pilot focus: formwork + tiling.
export const TRADES = [
  { key: "formwork", heights: true },
  { key: "rebar", heights: true },
  { key: "plaster", heights: true },
  { key: "tiling", heights: false },
  { key: "masonry", heights: true },
] as const;
export type TradeKey = (typeof TRADES)[number]["key"];
export const trade = (k: string) => TRADES.find((t) => t.key === k) ?? TRADES[TRADES.length - 1];

export const REGIONS = [
  { key: "north", cities: ["חיפה", "קריות", "נהריה", "עכו", "כרמיאל", "עפולה", "טבריה", "נוף הגליל", "יקנעם"] }, // i18n-data
  { key: "sharon", cities: ["נתניה", "חדרה", "כפר סבא", "רעננה", "הרצליה", "הוד השרון", "כפר יונה"] }, // i18n-data
  { key: "center", cities: ["תל אביב", "רמת גן", "גבעתיים", "פתח תקווה", "ראשון לציון", "חולון", "בת ים", "בני ברק", "רחובות", "נס ציונה", "לוד", "רמלה", "מודיעין", "ראש העין", "יבנה"] }, // i18n-data
  { key: "jerusalem", cities: ["ירושלים", "בית שמש", "מבשרת ציון", "מעלה אדומים"] }, // i18n-data
  { key: "south", cities: ["אשדוד", "אשקלון", "קריית גת", "באר שבע", "נתיבות", "שדרות", "אופקים", "דימונה", "אילת"] }, // i18n-data
] as const;
export const ALL_CITIES = REGIONS.flatMap((r) => r.cities as readonly string[]);
export const regionOf = (city: string) => REGIONS.find((r) => (r.cities as readonly string[]).includes(city))?.key ?? "center";

export const DOC_TYPES = [
  { key: "visa", required: true },
  { key: "passport", required: true },
  { key: "insurance", required: true },
  { key: "heights", required: false },
] as const;
export const docType = (k: string) => DOC_TYPES.find((d) => d.key === k) ?? DOC_TYPES[0];
// Site safety briefings are not here: they belong to a contractor's site, not to the worker (site_briefings, lib/queries.ts).
/** Documents a worker must hold, valid on the work date, to be placed in a given trade. */
export const requiredDocs = (tradeKey: string) =>
  DOC_TYPES.filter((d) => d.required || (d.key === "heights" && trade(tradeKey).heights)).map((d) => d.key);

export const COUNTRIES: Record<string, { lang: string }> = {
  IN: { lang: "hi" },
  LK: { lang: "si" },
  MD: { lang: "ro" },
  UZ: { lang: "uz" },
  CN: { lang: "zh" },
  BY: { lang: "ru" },
  GE: { lang: "ru" },
  RO: { lang: "ro" },
  TH: { lang: "th" },
  KE: { lang: "en" },
  MW: { lang: "en" },
};

// Rating tags are stored as these Hebrew strings; messages/<locale>/domain.ts `workTags` translates them.
export const WORK_TAGS = [
  "עבודה נקייה", "דייק בזמנים", "עובד מהר", "מקצועי מאוד", "צריך הכוונה", "בעיית תקשורת"]; // i18n-data
// Official contractor classification codes (stored as issued).
export const CLASSIFICATIONS = [
  "100 ג-1", "100 ג-2", "100 ג-3", "100 ג-4", "100 ג-5", "131 ב-1", "131 ג-1", "200 ג-1"]; // i18n-data

// ── Pricing ──────────────────────────────────────────────────────────────
export const VAT = 0.18;
/** Platform fees charged to the agency (contractor ↔ agency money never passes through us). */
export const PLATFORM = {
  feePerHour: 1, // ₪ per approved worker-hour - the platform's only charge, billed to the agency monthly
};
export const platformFee = (approvedHours: number) => approvedHours * PLATFORM.feePerHour;
/** What an idle worker-day costs the agency: ~211 paid hours/month at minimum wage + 13.1% deposit + levy/housing/insurance ≈ ₪11.5k / 22 days. */
export const IDLE_DAY_COST = 520;
export const MIN_DAYS_OPTIONS = [
  { v: 1 },
  { v: 5 },
  { v: 10 },
  { v: 22 },
];

export type PriceOpts = { lodging: "agency" | "contractor"; transport: "agency" | "contractor"; hours: number };
export type AgencyRates = { lodging_discount: number; transport_rate: number };
/** Final hourly price for a worker given lodging/transport choices. Base rate includes lodging by the agency. */
export function hourlyFor(base: number, a: AgencyRates, o: Pick<PriceOpts, "lodging" | "transport">) {
  return base - (o.lodging === "contractor" ? a.lodging_discount : 0) + (o.transport === "agency" ? a.transport_rate : 0);
}
export const DEFAULT_OPTS: PriceOpts = { lodging: "contractor", transport: "agency", hours: 9 };

/** A signed site safety briefing is usually valid for a year. */
export const BRIEFING_VALID_DAYS = 365;

// ── Dates (Israel time) ─────────────────────────────────────────────────
export const TZ = "Asia/Jerusalem";
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function nowParts(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  return { date: todayISO(now), time: p };
}
export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function diffDays(a: string, b: string) {
  return Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / 86400000);
}
export const isWorkday = (iso: string) => new Date(iso + "T12:00:00Z").getUTCDay() <= 4; // Sun–Thu
export function nextWorkday(iso: string) {
  let d = addDays(iso, 1);
  while (!isWorkday(d)) d = addDays(d, 1);
  return d;
}
/** End date of a block of `days` work days starting on `start`. */
export function endOfBlock(start: string, days: number) {
  let d = start, n = 1;
  while (n < days) { d = addDays(d, 1); if (isWorkday(d)) n++; }
  return d;
}

/** A booking is "locked" from 18:00 the evening before: the crew is fixed and the contractor sees names & photos. */
export const LOCK_HOUR = "18:00";
export function bookingPhase(b: { date: string; end_date: string; status: string }, now = new Date()) {
  const { date, time } = nowParts(now);
  if (b.status !== "approved") return b.status;
  const eve = addDays(b.date, -1);
  if (date > b.end_date) return "awaiting_hours";
  if (date > b.date) return "today";
  if (date === b.date) return time >= "06:00" ? "today" : "locked";
  if (date === eve && time >= LOCK_HOUR) return "locked";
  return "approved";
}
