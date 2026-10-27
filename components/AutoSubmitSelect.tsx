"use client";
import type { ComponentProps } from "react";

/** A select that saves its form as soon as the value changes, so there's no separate "update" click. */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
