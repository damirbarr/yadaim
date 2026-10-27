"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** Lodging/transport choice — changes the all-inclusive price shown everywhere. */
export function PriceToggles({ lodging, transport }: { lodging: string; transport: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    p.set(k, v);
    router.replace(`${path}?${p.toString()}`, { scroll: false });
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <div className="label">לינה</div>
        <div className="seg">
          <label><input type="radio" checked={lodging === "contractor"} onChange={() => set("lodging", "contractor")} />אצלי (זול יותר)</label>
          <label><input type="radio" checked={lodging === "agency"} onChange={() => set("lodging", "agency")} />אצל התאגיד</label>
        </div>
      </div>
      <div>
        <div className="label">הסעה לאתר</div>
        <div className="seg">
          <label><input type="radio" checked={transport === "agency"} onChange={() => set("transport", "agency")} />התאגיד מסיע</label>
          <label><input type="radio" checked={transport === "contractor"} onChange={() => set("transport", "contractor")} />אני מסדר</label>
        </div>
      </div>
    </div>
  );
}
