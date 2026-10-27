import { readSheet } from "read-excel-file/node";

/** Parse an uploaded CSV or XLSX file into rows keyed by (lower-cased, trimmed) header. */
export async function parseSheet(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let table: string[][];
  if (name.endsWith(".xlsx")) {
    const data = await readSheet(buf);
    table = data.map((row) => row.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c == null ? "" : String(c))));
  } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
    table = parseCSV(buf.toString("utf8").replace(/^﻿/, ""));
  } else throw new Error("קובץ CSV או XLSX בלבד");
  const [head, ...rest] = table.filter((r) => r.some((c) => c.trim()));
  if (!head) throw new Error("הקובץ ריק");
  const keys = head.map((h) => h.trim().toLowerCase());
  return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
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

/** First non-empty value among candidate header names (Hebrew or English). */
export function pick(row: Record<string, string>, keys: string[]) {
  for (const k of keys) {
    const v = row[k.toLowerCase()];
    if (v) return v;
  }
  return "";
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
  if (/^05\d{8}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d || "";
}
