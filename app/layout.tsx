import type { Metadata } from "next";
import { RecoveryFragmentBridge } from "@/app/ui/RecoveryFragmentBridge";
import { PendingAssetReviewBridge } from "@/app/ui/admin/PendingAssetReviewBridge";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL || "https://coffee-platform-baghdad-beta.onrender.com"),
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
      <body><RecoveryFragmentBridge /><PendingAssetReviewBridge />{children}</body>
    </html>
  );
}
