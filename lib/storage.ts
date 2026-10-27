import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomToken } from "./tokens";
import { config, features } from "./config";
import { supabaseAdmin } from "./supabase";

// Uploaded photos and documents. One small interface, two implementations: a private Supabase Storage
// bucket when it is configured, the local ./data/uploads folder otherwise. Files are always served through
// /api/files/[name], which checks permissions — the bucket itself stays private.
// Another backend (S3, R2…) = one more FileStore and one line in `store()`.

interface FileStore {
  put(name: string, data: Buffer, contentType: string): Promise<void>;
  get(name: string): Promise<Buffer | null>;
}

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const localStore: FileStore = {
  async put(name, data) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), data);
  },
  async get(name) {
    const file = path.join(UPLOAD_DIR, name);
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  },
};

const supabaseStore: FileStore = {
  async put(name, data, contentType) {
    const { error } = await supabaseAdmin().storage.from(config.supabase.bucket).upload(name, data, { contentType, upsert: false });
    if (error) throw new Error("שמירת הקובץ נכשלה: " + error.message);
  },
  async get(name) {
    const { data, error } = await supabaseAdmin().storage.from(config.supabase.bucket).download(name);
    return error || !data ? null : Buffer.from(await data.arrayBuffer());
  },
};

function store(): FileStore {
  if (features.supabaseStorage) return supabaseStore;
  // Serverless disks are wiped between requests, so a missing key there is a setup error, not a fallback.
  if (config.onVercel) throw new Error("אחסון קבצים לא הוגדר (SUPABASE_SERVICE_ROLE_KEY חסר)");
  return localStore;
}

export const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", pdf: "application/pdf" };
const MAX = 8 * 1024 * 1024;

/** Validate and store an upload. prefix p_ = photo (public on offer pages), d_ = document (restricted). */
export async function saveUpload(file: File | null, prefix: "p" | "d"): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX) throw new Error("קובץ גדול מדי (עד 8MB)");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!TYPES[ext]) throw new Error("סוג קובץ לא נתמך (תמונה או מסמך סרוק)");
  const name = `${prefix}_${randomToken(16)}.${ext}`;
  await store().put(name, Buffer.from(await file.arrayBuffer()), TYPES[ext]);
  return name;
}

export const readUpload = (name: string) => store().get(name);
