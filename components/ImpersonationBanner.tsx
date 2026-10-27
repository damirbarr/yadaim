import { stopImpersonation } from "@/app/actions/auth";

export function ImpersonationBanner({ user }: { user: { name: string; impersonator_id: number | null; impersonator_name: string | null } }) {
  if (!user.impersonator_id) return null;
  return (
    <div className="stripe sticky top-0 z-50 p-1">
      <form action={stopImpersonation} className="flex items-center justify-center gap-3 rounded-[3px] bg-ink px-3 py-1.5 text-xs text-white">
        <span>{user.impersonator_name} צופה במערכת בתור <b>{user.name}</b> (תמיכה). כל פעולה נרשמת ביומן.</span>
        <button className="rounded-[3px] bg-hazard px-2 py-0.5 font-semibold text-ink">חזרה לאדמין</button>
      </form>
    </div>
  );
}
