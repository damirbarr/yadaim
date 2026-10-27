"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { IUpload } from "./icons";
import { FileField } from "./FileField";

export function ImportForm({ action, title, hint, templates, paste }: { action: (s: FormState, fd: FormData) => Promise<FormState>; title: string; hint: string; templates: { label: string; href: string }[]; paste?: boolean }) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={run} className="card space-y-3 border-dashed p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[3px] bg-hazard"><IUpload /></span>
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted">{hint} {templates.map((t) => <a key={t.href} href={t.href} className="me-2 underline">{t.label}</a>)}</div>
        </div>
      </div>
      <FileField name="file" accept=".csv,.xlsx,.txt" />
      {paste && <textarea name="pasted" rows={3} className="input" placeholder={"או הדביקו רשימה — שורה לכל קבלן:\nמשה כהן 052-1234567\nאבי לוי, 054-7654321"} />}
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "מייבא…" : "ייבוא"}</button>
        {state?.ok && <span className="text-sm text-ok">{state.ok}</span>}
        {state?.error && <span className="text-sm text-bad">{state.error}</span>}
      </div>
    </form>
  );
}
