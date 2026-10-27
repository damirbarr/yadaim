"use client";
import { useState } from "react";
import { IUpload } from "./icons";
import { useI18n } from "@/lib/i18n/client";

/** File picker labelled in the UI language (the browser's native control shows "Choose File" in the OS language). */
export function FileField({ name, accept, capture, small = false }: { name: string; accept?: string; capture?: "environment" | "user"; small?: boolean }) {
  const { t } = useI18n();
  const [file, setFile] = useState<string>("");
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-[3px] border border-dashed border-line bg-white ${small ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"} hover:border-ink`}>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-[3px] bg-ink font-semibold text-white ${small ? "px-2 py-1" : "px-3 py-1.5"}`}>
        <IUpload className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />{t("agency.file.choose")}
      </span>
      <span className="min-w-0 truncate text-muted">{file || t("agency.file.none")}</span>
      <input type="file" name={name} accept={accept} capture={capture} className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
    </label>
  );
}
