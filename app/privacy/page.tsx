import { LegalPage } from "@/components/LegalPage";
import { getI18n, getLocale } from "@/lib/i18n/server";
import { privacy } from "@/messages/legal";

export async function generateMetadata() {
  return { title: privacy[await getLocale()].title };
}

export default async function Page() {
  const { t } = await getI18n();
  return <LegalPage doc={privacy[await getLocale()]} links={{ privacy: t("public.legal.privacy"), terms: t("public.legal.terms"), home: t("public.legal.home") }} />;
}
