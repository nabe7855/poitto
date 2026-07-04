import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ポイッと（POITTO）",
    template: "%s｜ポイッと",
  },
  description: "入れるだけで、証憑がかたづく。電子帳簿保存法対応の証憑自動ファイリング。",
  applicationName: "ポイッと",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ポイッと",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8542b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
