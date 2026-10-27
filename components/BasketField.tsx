"use client";
import { useSearchParams } from "next/navigation";

/** Carries the contractor's basket (`w=` worker ids) through a new search. Read at submit time from the live URL,
 *  since ResultsGrid updates it without a server render. */
export function BasketField() {
  const w = useSearchParams().get("w");
  return w ? <input type="hidden" name="w" value={w} /> : null;
}
