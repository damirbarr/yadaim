import type { Metadata, Viewport } from "next";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "@fontsource/assistant/latin-400.css";
import "@fontsource/assistant/latin-600.css";
import "@fontsource/assistant/latin-700.css";
import "@fontsource/frank-ruhl-libre/hebrew-500.css";
import "@fontsource/frank-ruhl-libre/hebrew-700.css";
import "@fontsource/frank-ruhl-libre/latin-500.css";
import "@fontsource/frank-ruhl-libre/latin-700.css";
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
    <html lang="he" dir="rtl">
      <body className="min-h-dvh antialiased">
        {children}
        <DevToolbar />
      </body>
    </html>
  );
}
