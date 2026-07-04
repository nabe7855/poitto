import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export const metadata: Metadata = {
  title: {
    default: "ポイッと（POITTO）",
    template: "%s｜ポイッと",
  },
  description: "入れるだけで、証憑がかたづく。電子帳簿保存法対応の証憑自動ファイリング。",
  applicationName: "ポイッと",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/brand/app-icon/poitto_appicon_256.png",
  },
  appleWebApp: {
    capable: true,
    title: "ポイッと",
    statusBarStyle: "default",
    startupImage: ["/brand/app-icon/poitto_appicon_512.png"],
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
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
