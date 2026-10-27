import { stopImpersonation } from "@/app/actions/auth";
import { getI18n } from "@/lib/i18n/server";

export async function ImpersonationBanner({ user }: { user: { name: string; impersonator_id: number | null; impersonator_name: string | null } }) {
  if (!user.impersonator_id) return null;
  const { t, rich } = await getI18n();
  return (
    <div className="stripe sticky top-0 z-50 p-1">
      <form action={stopImpersonation} className="flex items-center justify-center gap-3 rounded-[3px] bg-ink px-3 py-1.5 text-xs text-white">
        <span>{rich("common.impersonating", { b: (c) => <b>{c}</b> }, { admin: user.impersonator_name ?? "", user: user.name })}</span>
        <button className="rounded-[3px] bg-hazard px-2 py-0.5 font-semibold text-ink">{t("common.backToAdmin")}</button>
      </form>
    </div>
  );
}
