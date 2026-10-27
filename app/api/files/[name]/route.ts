import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { readUpload, TYPES } from "@/lib/storage";

/** Photos (p_*) are shown on public offer pages; documents (d_*) only to the owning agency, admins, or signed-in contractors. */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[pd]_[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(name)) return new NextResponse("bad name", { status: 400 });
  if (name.startsWith("d_")) {
    const u = await currentUser();
    const owner = await get<{ agency_id: number }>(`SELECT w.agency_id FROM documents d JOIN workers w ON w.id = d.worker_id WHERE d.file = ?`, name);
    const allowed = u && owner && (u.role === "admin" || u.role === "contractor" || (u.role === "agency" && u.agency_id === owner.agency_id));
    if (!allowed) return new NextResponse("forbidden", { status: 403 });
  }
  const buf = await readUpload(name);
  if (!buf) return new NextResponse("not found", { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": TYPES[name.split(".").pop()!] ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
}
