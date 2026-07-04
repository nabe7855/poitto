"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileDrawer } from "./mobile-drawer";
import { BottomNav } from "./nav-links";
import { DocumentsProvider } from "@/lib/store/documents-store";
import { useAuth } from "@/lib/auth/auth-context";
import { AUTH_ROUTES } from "@/lib/auth/config";

/** サイドバー＋ヘッダーの共通レイアウト骨格（＋認証ゲート） */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { realMode, status } = useAuth();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // 本番モードで未ログインならログイン画面へ
  useEffect(() => {
    if (realMode && !isAuthRoute && status === "guest") {
      router.replace("/signin");
    }
  }, [realMode, isAuthRoute, status, router]);

  // ログイン/登録ページはシェルなしでそのまま表示
  if (isAuthRoute) return <>{children}</>;

  // 認証チェック中／未ログイン（遷移待ち）はローディング
  if (realMode && status !== "authed") {
    return (
      <div className="grid min-h-screen place-items-center bg-background-soft">
        <Image
          src="/brand/mark/poitto_mark_256.png"
          alt="読み込み中"
          width={64}
          height={83}
          className="h-16 w-auto animate-pulse"
        />
      </div>
    );
  }

  return (
    <DocumentsProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setDrawerOpen(true)} />

          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 backdrop-blur-sm md:hidden">
          <BottomNav />
        </div>
      </div>
    </DocumentsProvider>
  );
}
