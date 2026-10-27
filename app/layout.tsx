import type { Metadata, Viewport } from "next";
import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-500.css";
import "@fontsource/rubik/hebrew-600.css";
import "@fontsource/rubik/hebrew-700.css";
import "@fontsource/rubik/latin-400.css";
import "@fontsource/rubik/latin-500.css";
import "@fontsource/rubik/latin-600.css";
import "@fontsource/rubik/latin-700.css";
// Rubik has no Arabic glyphs; the browser picks these for Arabic text only (unicode-range).
import "@fontsource/noto-sans-arabic/arabic-400.css";
import "@fontsource/noto-sans-arabic/arabic-500.css";
import "@fontsource/noto-sans-arabic/arabic-600.css";
import "@fontsource/noto-sans-arabic/arabic-700.css";
import "./globals.css";
import { DevToolbar } from "@/components/DevToolbar";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { messages } from "@/messages";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  const brand = t("common.brand");
  return { title: { default: `${brand} · ${t("common.tagline")}`, template: `%s · ${brand}` }, description: t("common.tagline") };
}
export const viewport: Viewport = { themeColor: "#0e2a44", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getI18n();
  return (
    // Browser extensions (password managers, translators, AI sidebars) add attributes to <html>/<body> before
    // React hydrates; this only silences that, one level deep, and not mismatches inside the app.
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <I18nProvider locale={locale} messages={messages[locale]}>
          {children}
          <DevToolbar />
        </I18nProvider>
      </body>
    </html>
  );
}
