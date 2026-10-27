import "server-only";
import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "./db";
import { randomToken } from "./tokens";
import { storageEnabled, supabaseAdmin } from "./supabase";

// Uploaded photos and documents. Local disk in development, a private Supabase Storage bucket in production
// (bucket name: SUPABASE_BUCKET, default "uploads"). Files are always served through /api/files/[name],
// which checks permissions — the bucket itself stays private.

const BUCKET = () => process.env.SUPABASE_BUCKET || "uploads";
export const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", pdf: "application/pdf" };
const MAX = 8 * 1024 * 1024;

/** Validate and store an upload. prefix p_ = photo (public on offer pages), d_ = document (restricted). */
export async function saveUpload(file: File | null, prefix: "p" | "d"): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX) throw new Error("קובץ גדול מדי (עד 8MB)");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!TYPES[ext]) throw new Error("סוג קובץ לא נתמך (תמונה או מסמך סרוק)");
  const name = `${prefix}_${randomToken(16)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  if (storageEnabled()) {
    const { error } = await supabaseAdmin().storage.from(BUCKET()).upload(name, buf, { contentType: TYPES[ext], upsert: false });
    if (error) throw new Error("שמירת הקובץ נכשלה: " + error.message);
  } else {
    if (process.env.VERCEL) throw new Error("אחסון קבצים לא הוגדר (SUPABASE_SERVICE_ROLE_KEY חסר)");
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  }
  return name;
}

export async function readUpload(name: string): Promise<Buffer | null> {
  if (storageEnabled()) {
    const { data, error } = await supabaseAdmin().storage.from(BUCKET()).download(name);
    return error || !data ? null : Buffer.from(await data.arrayBuffer());
  }
  const file = path.join(UPLOAD_DIR, name);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}
