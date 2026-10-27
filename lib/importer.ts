import { readSheet } from "read-excel-file/node";

/** One field the app understands in an imported sheet. `aliases` are header names recognised automatically
 *  (Hebrew and English, compared case- and punctuation-insensitively). Fields that share a `need` key are
 *  alternatives: at least one of them must be mapped (e.g. full name OR first name). */
export type ImportField = { key: string; label: string; aliases: string[]; need?: string };

/** Sent back to the browser when the sheet doesn't match the template, so the user maps columns to fields. */
export type MappingRequest = {
  fields: { key: string; label: string; need?: string }[];
  headers: string[];
  sample: string[][];
  /** field key → column index (-1 = not imported) */
  suggested: Record<string, number>;
};
export type ImportState = { ok?: string; error?: string; mapping?: MappingRequest } | undefined;

/** Read the file and turn it into rows keyed by field. A sheet whose every column is recognised imports
 *  straight away; anything else (unknown or missing columns) asks the user to confirm the mapping first. */
export async function readImport(file: File, fields: ImportField[], mappingJson: string | null): Promise<{ rows: Record<string, string>[] } | { mapping: MappingRequest }> {
  const { headers, rows } = await parseSheet(file);
  let map: Record<string, number>;
  if (mappingJson) {
    map = JSON.parse(mappingJson);
    const missing = missingNeeds(fields, map);
    if (missing.length) throw new Error(`חסרה התאמה ל: ${missing.join(", ")}`);
  } else {
    map = autoMap(headers, fields);
    const used = new Set(Object.values(map));
    const perfect = !missingNeeds(fields, map).length && headers.every((h, i) => !h.trim() || used.has(i));
    if (!perfect) {
      return { mapping: { fields: fields.map(({ key, label, need }) => ({ key, label, need })), headers, sample: rows.slice(0, 3), suggested: Object.fromEntries(fields.map((f) => [f.key, map[f.key] ?? -1])) } };
    }
  }
  return { rows: rows.map((r) => Object.fromEntries(fields.map((f) => [f.key, map[f.key] >= 0 ? (r[map[f.key]] ?? "").trim() : ""]))) };
}

/** Columns of the workers sheet. Doc fields are keyed `doc_<DOC_TYPES key>` and hold an expiry date. */
export const WORKER_FIELDS: ImportField[] = [
  { key: "full_name", label: "שם מלא", aliases: ["שם מלא", "שם העובד", "שם", "name", "full name", "worker"], need: "name" },
  { key: "first_name", label: "שם פרטי", aliases: ["שם פרטי", "first name", "first"], need: "name" },
  { key: "last_name", label: "שם משפחה", aliases: ["שם משפחה", "last name", "last", "surname"] },
  { key: "trade", label: "מקצוע", aliases: ["מקצוע", "תפקיד", "trade", "profession", "job"], need: "trade" },
  { key: "country", label: "ארץ מוצא", aliases: ["ארץ", "ארץ מוצא", "נתינות", "מדינה", "country", "nationality"], need: "country" },
  { key: "years", label: "שנות ניסיון", aliases: ["שנות ניסיון", "ותק", "ניסיון", "years", "experience"] },
  { key: "phone", label: "טלפון", aliases: ["טלפון", "נייד", "פלאפון", "phone", "mobile"] },
  { key: "passport_no", label: "מספר דרכון", aliases: ["דרכון", "מספר דרכון", "מס דרכון", "passport", "passport no"] },
  { key: "rate", label: "תעריף שעתי", aliases: ["תעריף", "תעריף שעתי", "שכר שעתי", "rate", "hourly"] },
  { key: "doc_visa", label: "תוקף אשרה", aliases: ["תוקף אשרה", "אשרה", "תוקף ויזה", "ויזה", "visa", "visa expiry"] },
  { key: "doc_passport", label: "תוקף דרכון", aliases: ["תוקף דרכון", "passport expiry"] },
  { key: "doc_insurance", label: "תוקף ביטוח", aliases: ["תוקף ביטוח", "ביטוח", "ביטוח רפואי", "insurance"] },
  { key: "doc_safety", label: "הדרכת בטיחות", aliases: ["הדרכת בטיחות", "בטיחות", "safety"] },
  { key: "doc_heights", label: "עבודה בגובה", aliases: ["עבודה בגובה", "גובה", "heights"] },
];

export const CONTACT_FIELDS: ImportField[] = [
  { key: "name", label: "שם", aliases: ["שם", "איש קשר", "שם מלא", "name", "contact"] },
  { key: "company", label: "חברה", aliases: ["חברה", "שם חברה", "קבלן", "company"] },
  { key: "phone", label: "טלפון", aliases: ["טלפון", "נייד", "פלאפון", "phone", "mobile"], need: "phone" },
  { key: "city", label: "עיר", aliases: ["עיר", "אזור", "יישוב", "city"] },
];

const norm = (s: string) => s.toLowerCase().replace(/["'׳״`()\[\]{}:.,_-]/g, " ").replace(/\s+/g, " ").trim();

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

/** Labels of required groups that have no column mapped. */
export function missingNeeds(fields: { key: string; label: string; need?: string }[], map: Record<string, number>): string[] {
  const groups = new Map<string, string[]>();
  for (const f of fields) if (f.need) groups.set(f.need, [...(groups.get(f.need) ?? []), f.key]);
  return [...groups.values()].filter((keys) => !keys.some((k) => (map[k] ?? -1) >= 0))
    .map((keys) => keys.map((k) => fields.find((f) => f.key === k)!.label).join(" או "));
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
  } else throw new Error("קובץ אקסל או CSV בלבד");
  const [head, ...rest] = table.filter((r) => r.some((c) => c.trim()));
  if (!head) throw new Error("הקובץ ריק");
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
