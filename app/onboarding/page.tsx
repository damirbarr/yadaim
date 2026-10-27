import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, homeFor } from "@/lib/auth";
import { OnboardingForm } from "@/components/OnboardingForm";
import { Logo } from "@/components/ui";
import { logout } from "@/app/actions/auth";

export const metadata = { title: "השלמת פרטים" };

export default async function Onboarding() {
  const u = await currentUser("pending");
  if (!u) redirect("/login");
  if (u.role !== "pending") redirect(homeFor(u.role));
  const intent = (await cookies()).get("yd_intent")?.value === "agency" ? "agency" : "contractor";
  return (
    <main className="min-h-dvh">
      <header className="blueprint border-b-2 border-hazard"><div className="mx-auto max-w-2xl px-4 py-4"><Link href="/"><Logo dark /></Link></div></header>
      <div className="mx-auto grid max-w-2xl gap-6 px-4 py-10">
      <div className="sheet border-t-[3px] border-t-ink p-6 md:p-8">
        <div className="eyebrow mb-1">שלב אחרון · פרטי הארגון</div>
        <h1 className="mb-1 text-[34px] font-bold leading-tight text-ink">ברוכים הבאים, {u.name.split(" ")[0]}.</h1>
        <p className="mb-6 border-b border-dashed border-line pb-4 text-[15px] text-muted">מחוברים כ-<span dir="ltr">{u.email}</span>. עוד צעד אחד: ספרו לנו מי אתם.</p>
        <OnboardingForm initialKind={intent} name={u.name} />
      </div>
      <form action={logout} className="text-center"><button className="text-sm text-muted underline">יציאה</button></form>
      </div>
    </main>
  );
}
