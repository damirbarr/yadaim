import type { ReactNode } from "react";

/** Sheet header bar: bold title at the start, a muted note at the end (wraps under the title on a phone). */
export function SheetHead({ title, note, id }: { title: ReactNode; note?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-line px-4 py-3 sm:px-5">
      <h2 id={id} className="text-[19px] font-bold text-ink sm:text-[21px]">{title}</h2>
      {note && <span className="text-[13px] text-muted">{note}</span>}
    </div>
  );
}

/** Quiet explainer: a bordered box with a lime corner, one big number and one sentence on why it matters. */
export function WhyBox({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <aside className="relative rounded-[3px] border border-line bg-paper/60 p-4">
      <span aria-hidden className="absolute -top-px -start-px h-5 w-5 bg-hazard [clip-path:polygon(0_0,100%_0,0_100%)] rtl:[clip-path:polygon(0_0,100%_0,100%_100%)]" />
      <div className="text-[12px] font-bold text-muted">{label}</div>
      <div className="mt-1.5 flex items-center gap-4">
        <div className="num shrink-0 text-[34px] font-bold leading-none text-ink">{value}</div>
        <p className="text-[13px] leading-snug text-text">{children}</p>
      </div>
    </aside>
  );
}
