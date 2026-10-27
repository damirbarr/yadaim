import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomToken } from "./tokens";
import { config, features } from "./config";
import { supabaseAdmin } from "./supabase";
import { getI18n } from "./i18n/server";

// Uploaded photos and documents. One small interface, two implementations: a private Supabase Storage
// bucket when it is configured, the local ./data/uploads folder otherwise. Files are always served through
// /api/files/[name], which checks permissions - the bucket itself stays private.
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
    if (error) {
      console.error("storage upload failed:", error.message);
      throw new Error((await getI18n()).t("agency.upload.failed"));
    }
  },
  async get(name) {
    const { data, error } = await supabaseAdmin().storage.from(config.supabase.bucket).download(name);
    return error || !data ? null : Buffer.from(await data.arrayBuffer());
  },
};

async function store(): Promise<FileStore> {
  if (features.supabaseStorage) return supabaseStore;
  // Serverless disks are wiped between requests, so a missing key there is a setup error, not a fallback.
  if (config.onVercel) {
    console.error("file storage is not configured: SUPABASE_SERVICE_ROLE_KEY is missing");
    throw new Error((await getI18n()).t("agency.upload.notConfigured"));
  }
  return localStore;
}

export const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", pdf: "application/pdf" };
const MAX = 8 * 1024 * 1024;

/** Validate and store an upload. prefix p_ = photo (public on offer pages), d_ = document (restricted). */
export async function saveUpload(file: File | null, prefix: "p" | "d"): Promise<string | null> {
  if (!file || file.size === 0) return null;
  // The messages are shown to the user as is (server actions return them as form errors).
  const { t } = await getI18n();
  if (file.size > MAX) throw new Error(t("agency.upload.tooBig"));
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!TYPES[ext]) throw new Error(t("agency.upload.badType"));
  const name = `${prefix}_${randomToken(16)}.${ext}`;
  await (await store()).put(name, Buffer.from(await file.arrayBuffer()), TYPES[ext]);
  return name;
}

export const readUpload = async (name: string) => (await store()).get(name);
