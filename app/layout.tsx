import type { Metadata, Viewport } from "next";
import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-500.css";
import "@fontsource/rubik/hebrew-600.css";
import "@fontsource/rubik/hebrew-700.css";
import "@fontsource/rubik/latin-400.css";
import "@fontsource/rubik/latin-500.css";
import "@fontsource/rubik/latin-600.css";
import "@fontsource/rubik/latin-700.css";
import "./globals.css";
import { BRAND } from "@/lib/domain";
import { DevToolbar } from "@/components/DevToolbar";

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — עובדי בניין מתאגידים מורשים`, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
};
export const viewport: Viewport = { themeColor: "#0e2a44", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions (password managers, translators, AI sidebars) add attributes to <html>/<body> before
    // React hydrates; this only silences that, one level deep, and not mismatches inside the app.
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        {children}
        <DevToolbar />
      </body>
    </html>
  );
}
