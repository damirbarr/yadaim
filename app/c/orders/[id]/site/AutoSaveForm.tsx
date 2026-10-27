"use client";
import type { ReactNode } from "react";

/** A form that saves as soon as one of its fields changes (picking a time is the whole action, no "save" tap). */
export function AutoSaveForm({ action, className, children }: { action: (fd: FormData) => Promise<void>; className?: string; children: ReactNode }) {
  return <form action={action} className={className} onChange={(e) => e.currentTarget.requestSubmit()}>{children}</form>;
}
