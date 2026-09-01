import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://coffee-platform-v1-private.skids0409.chatgpt.site"),
  title: {
    default: "منصة القهوة V1 — بغداد",
    template: "%s | قهوتنا",
  },
  description: "دليل عراقي لاكتشاف القهوة والمعدات والجهات ومقارنتها",
  applicationName: "قهوتنا",
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    type: "website",
    locale: "ar_IQ",
    title: "منصة القهوة V1 — بغداد",
    description: "دليل عراقي لاكتشاف القهوة والمعدات والجهات ومقارنتها",
    siteName: "قهوتنا",
  },
  other: { "codex-preview": "development" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
