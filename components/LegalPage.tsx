import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { LEGAL_UPDATED, type LegalDoc } from "@/messages/legal";

/** Public legal page (privacy, terms): navy header, one sheet of text. */
export function LegalPage({ doc, links }: { doc: LegalDoc; links: { privacy: string; terms: string; home: string } }) {
  return (
    <PublicShell>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="eyebrow mb-1">{doc.eyebrow}</div>
        <h1 className="text-[34px] font-bold leading-tight text-ink md:text-[42px]">{doc.title}</h1>
        <p className="mt-1 text-[14px] text-muted">{doc.updated}: <bdi>{LEGAL_UPDATED}</bdi></p>
        <article className="sheet mt-6 space-y-5 p-6 text-[16px] leading-relaxed md:p-8">
          <p>{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.h} className="space-y-2">
              <h2 className="text-[22px] font-bold text-ink">{s.h}</h2>
              {s.li && <ul className="list-disc space-y-1 ps-5">{s.li.map((x) => <li key={x}>{x}</li>)}</ul>}
              {s.p && <p>{s.p}</p>}
            </section>
          ))}
        </article>
        <p className="mt-6 flex gap-3 text-[14px] text-muted"><Link href="/privacy" className="underline">{links.privacy}</Link><Link href="/terms" className="underline">{links.terms}</Link><Link href="/" className="underline">{links.home}</Link></p>
      </main>
    </PublicShell>
  );
}
