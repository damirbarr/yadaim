"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

/** Lodging/transport choice - changes the all-inclusive price shown everywhere. */
export function PriceToggles({ lodging, transport }: { lodging: string; transport: string }) {
  const { t } = useI18n();
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
        <div className="label">{t("contractor.prices.lodging")}</div>
        <div className="seg">
          <label><input type="radio" checked={lodging === "contractor"} onChange={() => set("lodging", "contractor")} />{t("contractor.prices.lodgingOurs")}</label>
          <label><input type="radio" checked={lodging === "agency"} onChange={() => set("lodging", "agency")} />{t("contractor.prices.lodgingAgency")}</label>
        </div>
      </div>
      <div>
        <div className="label">{t("contractor.prices.transport")}</div>
        <div className="seg">
          <label><input type="radio" checked={transport === "agency"} onChange={() => set("transport", "agency")} />{t("contractor.prices.transportAgency")}</label>
          <label><input type="radio" checked={transport === "contractor"} onChange={() => set("transport", "contractor")} />{t("contractor.prices.transportOurs")}</label>
        </div>
      </div>
    </div>
  );
}
