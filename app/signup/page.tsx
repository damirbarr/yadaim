import { redirect } from "next/navigation";

// Sign-up happens through Google on /login; the first sign-in leads to /onboarding.
export default async function Signup({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  redirect(`/login${role === "agency" || role === "contractor" ? `?intent=${role}` : ""}`);
}
