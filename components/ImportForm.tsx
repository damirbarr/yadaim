"use client";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { ImportState, MappingRequest } from "@/lib/importer";
import { IUpload } from "./icons";

type Action = (s: ImportState, fd: FormData) => Promise<ImportState>;

/** Picking (or dropping) a file starts the import right away; there is no separate "import" click.
 *  A sheet that matches the template is imported as is. Otherwise the server answers with the sheet's
 *  columns and the user maps them to our fields once, then the same file is sent again with the mapping.
 *  The optional paste box is the one place that needs a button, since typing has no natural "done". */
export function ImportForm({ action, title, hint, templates, paste }: { action: Action; title: string; hint: string; templates: { label: string; href: string }[]; paste?: boolean }) {
  const [state, run, pending] = useActionState<ImportState, FormData>(action, undefined);
  const file = useRef<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [text, setText] = useState("");
  useEffect(() => { if (state?.ok) setText(""); }, [state]);

  const send = (fields: Record<string, string | File>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    startTransition(() => run(fd));
  };
  const pick = (f: File | undefined) => {
    if (!f) return;
    file.current = f;
    if (input.current) input.current.value = ""; // so picking the same file again still fires
    send({ file: f });
  };

  return (
    <div className="card space-y-3 p-4">
      {state?.mapping && file.current ? (
        <ColumnMapper key={file.current.name + file.current.lastModified} req={state.mapping} fileName={file.current.name} pending={pending}
          onCancel={() => { file.current = null; startTransition(() => run(new FormData())); }}
          onConfirm={(m) => send({ file: file.current!, mapping: JSON.stringify(m) })} />
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`grid cursor-pointer grid-cols-[44px_1fr] items-center gap-3 rounded-[3px] border-2 border-dashed p-4 focus-within:border-ink sm:grid-cols-[44px_1fr_auto] ${drag ? "border-ink bg-hazard-soft" : "border-line hover:border-ink"} ${pending ? "pointer-events-none opacity-60" : ""}`}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[3px] bg-hazard"><IUpload /></span>
          <div className="min-w-0">
            <div className="font-semibold">{pending ? "קוראים את הקובץ…" : title}</div>
            <div className="text-xs text-muted">{hint}</div>
          </div>
          <span className="btn-primary col-span-2 sm:col-span-1"><IUpload className="h-4 w-4" />בחירת קובץ</span>
          <input ref={input} type="file" name="file" accept=".csv,.xlsx,.txt" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
      {paste && !state?.mapping && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <textarea name="pasted" rows={3} value={text} onChange={(e) => setText(e.target.value)} className="input flex-1" placeholder={"או הדביקו רשימה, שורה לכל קבלן:\nמשה כהן 052-1234567\nאבי לוי, 054-7654321"} />
          <button type="button" className="btn-primary shrink-0" disabled={pending || !text.trim()} onClick={() => send({ pasted: text })}>הוספת הרשימה</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {state?.ok && <span className="font-semibold text-ok">✓ {state.ok}</span>}
        {state?.error && <span className="text-bad">{state.error}</span>}
        {!state?.mapping && templates.map((t) => <a key={t.href} href={t.href} className="text-xs text-muted underline">{t.label}</a>)}
      </div>
    </div>
  );
}

/** One row per field we understand; each picks a column of the user's sheet, with sample values to recognise it. */
function ColumnMapper({ req, fileName, pending, onCancel, onConfirm }: { req: MappingRequest; fileName: string; pending: boolean; onCancel: () => void; onConfirm: (m: Record<string, number>) => void }) {
  const [map, setMap] = useState<Record<string, number>>(req.suggested);
  const col = (i: number) => req.headers[i]?.trim() || `עמודה ${i + 1}`;
  const sample = (i: number) => req.sample.map((r) => r[i]).filter(Boolean).slice(0, 2).join(" · ");
  const needs = [...new Set(req.fields.map((f) => f.need).filter(Boolean))] as string[];
  const missing = needs.filter((n) => !req.fields.some((f) => f.need === n && (map[f.key] ?? -1) >= 0))
    .map((n) => req.fields.filter((f) => f.need === n).map((f) => f.label).join(" או "));
  const used = new Set(Object.values(map).filter((i) => i >= 0));
  const unused = req.headers.map((_, i) => i).filter((i) => req.headers[i].trim() && !used.has(i));
  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold">התאימו את העמודות בקובץ</div>
        <div className="text-xs text-muted">הקובץ <span dir="ltr">{fileName}</span> לא בנוי בדיוק כמו התבנית. בחרו לכל שדה את העמודה המתאימה. מה שכבר זיהינו מסומן.</div>
      </div>
      <div className="divide-y divide-dashed divide-line border-y border-line">
        {req.fields.map((f) => {
          const i = map[f.key] ?? -1;
          return (
            <div key={f.key} className="grid gap-1 py-2 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-3">
              <div className="text-sm font-semibold">{f.label}{f.need && <span className="ms-1 text-xs font-normal text-muted">{req.fields.filter((x) => x.need === f.need).length > 1 ? "(אחד מהשניים חובה)" : "(חובה)"}</span>}</div>
              <div className="min-w-0">
                <select aria-label={f.label} value={i} onChange={(e) => setMap({ ...map, [f.key]: Number(e.target.value) })} className={`input py-1.5 text-sm ${i >= 0 ? "border-ink" : ""}`}>
                  <option value={-1}>לא לייבא</option>
                  {req.headers.map((_, h) => <option key={h} value={h}>{col(h)}</option>)}
                </select>
                {i >= 0 && sample(i) && <div className="mt-0.5 truncate text-xs text-muted">למשל: {sample(i)}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {unused.length > 0 && <p className="text-xs text-muted">עמודות שלא ייובאו: {unused.map(col).join(", ")}</p>}
      {missing.length > 0 && <p className="text-sm text-bad">חסרה עמודה ל: {missing.join(", ")}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={pending || missing.length > 0} onClick={() => onConfirm(map)}>{pending ? "מייבאים…" : "ייבוא מהקובץ"}</button>
        <button type="button" className="btn-ghost" disabled={pending} onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}
