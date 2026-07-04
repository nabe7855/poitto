"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileDrawer } from "./mobile-drawer";
import { BottomNav } from "./nav-links";
import { DocumentsProvider } from "@/lib/store/documents-store";

/** サイドバー＋ヘッダーの共通レイアウト骨格 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <DocumentsProvider>
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setDrawerOpen(true)} />

        {/* モバイルは下部ナビ分の余白を確保 */}
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* モバイル下部タブ */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 backdrop-blur-sm md:hidden">
        <BottomNav />
      </div>
    </div>
    </DocumentsProvider>
  );
}
