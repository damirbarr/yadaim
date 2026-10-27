"use client";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/** Sending happens in WhatsApp, in another tab or app. When the agency comes back, show who is done and who is next. */
export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    const back = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => { document.removeEventListener("visibilitychange", back); window.removeEventListener("focus", back); };
  }, [router]);
  return null;
}

/** A link that opens WhatsApp (through /api/wa, which records the send) and refreshes this page shortly after. */
export function WaLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <a href={href} target="_blank" rel="noopener" className={className} onClick={() => setTimeout(() => router.refresh(), 1500)}>
      {children}
    </a>
  );
}
