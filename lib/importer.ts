import { readSheet } from "read-excel-file/node";

/** One field the app understands in an imported sheet. Its label is `import.fields.<key>` in the messages.
 *  `aliases` are header names recognised automatically (Hebrew, Arabic and English, compared case- and
 *  punctuation-insensitively). Fields that share a `need` key are alternatives: at least one of them must be
 *  mapped (e.g. full name OR first name). */
export type ImportField = { key: string; aliases: string[]; need?: string };

/** Sent back to the browser when the sheet doesn't match the template, so the user maps columns to fields. */
export type MappingRequest = {
  fields: { key: string; label: string; need?: string }[];
  headers: string[];
  sample: string[][];
  /** field key → column index (-1 = not imported) */
  suggested: Record<string, number>;
};
export type ImportState = { ok?: string; error?: string; mapping?: MappingRequest } | undefined;

/** A problem with the uploaded file. The caller turns `code` into a message in the user's language;
 *  for "missing", `groups` lists the required field groups (field keys) that have no column. */
export class ImportError extends Error {
  constructor(public code: "empty" | "format" | "missing" | "badMapping", public groups: string[][] = []) {
    super(code);
  }
}

/** Read the file and turn it into rows keyed by field. A sheet whose every column is recognised imports
 *  straight away; anything else (unknown or missing columns) asks the user to confirm the mapping first.
 *  `label` gives a field's name in the user's language for the mapping screen. */
export async function readImport(file: File, fields: ImportField[], mappingJson: string | null, label: (key: string) => string): Promise<{ rows: Record<string, string>[] } | { mapping: MappingRequest }> {
  const { headers, rows } = await parseSheet(file);
  let map: Record<string, number>;
  if (mappingJson) {
    try { map = JSON.parse(mappingJson); } catch { throw new ImportError("badMapping"); }
    const missing = missingNeeds(fields, map);
    if (missing.length) throw new ImportError("missing", missing);
  } else {
    map = autoMap(headers, fields);
    const used = new Set(Object.values(map));
    const perfect = !missingNeeds(fields, map).length && headers.every((h, i) => !h.trim() || used.has(i));
    if (!perfect) {
      return { mapping: { fields: fields.map(({ key, need }) => ({ key, label: label(key), need })), headers, sample: rows.slice(0, 3), suggested: Object.fromEntries(fields.map((f) => [f.key, map[f.key] ?? -1])) } };
    }
  }
  return { rows: rows.map((r) => Object.fromEntries(fields.map((f) => [f.key, map[f.key] >= 0 ? (r[map[f.key]] ?? "").trim() : ""]))) };
}

/** Columns of the workers sheet. Doc fields are keyed `doc_<DOC_TYPES key>` and hold an expiry date. */
export const WORKER_FIELDS: ImportField[] = [
  { key: "full_name", aliases: ["שם מלא", "שם העובד", "שם", "الاسم الكامل", "اسم العامل", "الاسم", "name", "full name", "worker"], need: "name" }, // i18n-data
  { key: "first_name", aliases: ["שם פרטי", "الاسم الشخصي", "الاسم الأول", "first name", "first"], need: "name" }, // i18n-data
  { key: "last_name", aliases: ["שם משפחה", "اسم العائلة", "last name", "last", "surname"] }, // i18n-data
  { key: "trade", aliases: ["מקצוע", "תפקיד", "المهنة", "مهنة", "trade", "profession", "job"], need: "trade" }, // i18n-data
  { key: "country", aliases: ["ארץ", "ארץ מוצא", "נתינות", "מדינה", "البلد", "بلد المنشأ", "الجنسية", "country", "nationality"], need: "country" }, // i18n-data
  { key: "years", aliases: ["שנות ניסיון", "ותק", "ניסיון", "سنوات الخبرة", "الخبرة", "years", "experience"] }, // i18n-data
  { key: "phone", aliases: ["טלפון", "נייד", "פלאפון", "الهاتف", "هاتف", "الجوال", "phone", "mobile"] }, // i18n-data
  { key: "passport_no", aliases: ["דרכון", "מספר דרכון", "מס דרכון", "رقم الجواز", "رقم جواز السفر", "جواز السفر", "passport", "passport no"] }, // i18n-data
  { key: "rate", aliases: ["תעריף", "תעריף שעתי", "שכר שעתי", "الأجر بالساعة", "الأجر", "rate", "hourly"] }, // i18n-data
  { key: "doc_visa", aliases: ["תוקף אשרה", "אשרה", "תוקף ויזה", "ויזה", "صلاحية التأشيرة", "التأشيرة", "visa", "visa expiry"] }, // i18n-data
  { key: "doc_passport", aliases: ["תוקף דרכון", "صلاحية جواز السفر", "صلاحية الجواز", "passport expiry"] }, // i18n-data
  { key: "doc_insurance", aliases: ["תוקף ביטוח", "ביטוח", "ביטוח רפואי", "صلاحية التأمين", "التأمين", "insurance"] }, // i18n-data
  { key: "doc_safety", aliases: ["הדרכת בטיחות", "בטיחות", "إرشاد السلامة", "السلامة", "safety"] }, // i18n-data
  { key: "doc_heights", aliases: ["עבודה בגובה", "גובה", "العمل على ارتفاع", "heights"] }, // i18n-data
];

export const CONTACT_FIELDS: ImportField[] = [
  { key: "name", aliases: ["שם", "איש קשר", "שם מלא", "الاسم", "جهة الاتصال", "الاسم الكامل", "name", "contact"] }, // i18n-data
  { key: "company", aliases: ["חברה", "שם חברה", "קבלן", "الشركة", "اسم الشركة", "المقاول", "company"] }, // i18n-data
  { key: "phone", aliases: ["טלפון", "נייד", "פלאפון", "الهاتف", "هاتف", "الجوال", "phone", "mobile"], need: "phone" }, // i18n-data
  { key: "city", aliases: ["עיר", "אזור", "יישוב", "المدينة", "البلدة", "city"] }, // i18n-data
];

const norm = (s: string) => s.toLowerCase().replace(/["'׳״`()\[\]{}:.,_-]/g, " ").replace(/\s+/g, " ").trim(); // i18n-data: Hebrew quote marks

/** Exact alias matches first, then "header contains alias" (longest alias wins). Each column is used once. */
export function autoMap(headers: string[], fields: ImportField[]): Record<string, number> {
  const map: Record<string, number> = {};
  const taken = new Set<number>();
  const H = headers.map(norm);
  for (const f of fields) {
    const i = H.findIndex((h, i) => !taken.has(i) && f.aliases.some((a) => norm(a) === h));
    if (i >= 0) { map[f.key] = i; taken.add(i); }
  }
  const loose = fields.filter((f) => map[f.key] == null)
    .flatMap((f) => f.aliases.map((a) => ({ f, a: norm(a) })))
    .filter((x) => x.a.length >= 3)
    .sort((x, y) => y.a.length - x.a.length);
  for (const { f, a } of loose) {
    if (map[f.key] != null) continue;
    const i = H.findIndex((h, i) => !taken.has(i) && h.includes(a));
    if (i >= 0) { map[f.key] = i; taken.add(i); }
  }
  return map;
}

/** Required field groups (as lists of field keys) that have no column mapped. */
export function missingNeeds(fields: { key: string; need?: string }[], map: Record<string, number>): string[][] {
  const groups = new Map<string, string[]>();
  for (const f of fields) if (f.need) groups.set(f.need, [...(groups.get(f.need) ?? []), f.key]);
  return [...groups.values()].filter((keys) => !keys.some((k) => (map[k] ?? -1) >= 0));
}

/** Parse an uploaded CSV or XLSX file into its header row and data rows. */
export async function parseSheet(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let table: string[][];
  if (name.endsWith(".xlsx")) {
    const data = await readSheet(buf);
    table = data.map((row) => row.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c == null ? "" : String(c))));
  } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
    table = parseCSV(buf.toString("utf8").replace(/^\uFEFF/, ""));
  } else throw new ImportError("format");
  const [head, ...rest] = table.filter((r) => r.some((c) => c.trim()));
  if (!head) throw new ImportError("empty");
  return { headers: head.map((h) => h.trim()), rows: rest.map((r) => head.map((_, i) => (r[i] ?? "").trim())) };
}

function parseCSV(text: string): string[][] {
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Accepts 2027-03-31, 31/03/2027, 31.3.27, 03/2027 → YYYY-MM-DD (or null). */
export function normalizeDate(s: string): string | null {
  s = s.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})[./-](\d{4})$/);
  if (m) {
    const last = new Date(Date.UTC(Number(m[2]), Number(m[1]), 0)).getUTCDate();
    return `${m[2]}-${m[1].padStart(2, "0")}-${last}`;
  }
  return null;
}

export function normalizePhone(s: string) {
  let d = s.replace(/[^\d+]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4);
  else if (d.startsWith("972")) d = "0" + d.slice(3);
  if (/^5\d{8}$/.test(d)) d = "0" + d; // Excel drops the leading zero of numeric cells
  if (/^05\d{8}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d || "";
}
