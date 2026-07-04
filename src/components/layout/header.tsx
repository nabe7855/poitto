"use client";

import Image from "next/image";
import Link from "next/link";
import { IconMenu2, IconMailbox, IconLogout } from "@tabler/icons-react";
import { useAuth } from "@/lib/auth/auth-context";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { realMode, status, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-black/[0.06] bg-white/85 px-4 backdrop-blur-sm md:h-16 md:px-8">
      {/* モバイル: メニュー開閉 */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="メニューを開く"
        className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/70 hover:bg-black/[0.05] md:hidden"
      >
        <IconMenu2 size={22} stroke={1.75} />
      </button>

      {/* モバイル: ロゴ（デスクトップはサイドバーに表示） */}
      <Link href="/" className="md:hidden" aria-label="ポイッと ホーム">
        <Image
          src="/brand/logo/poitto_logo_horizontal.png"
          alt="ポイッと POITTO"
          width={128}
          height={30}
          priority
          className="h-7 w-auto"
        />
      </Link>

      <div className="flex-1" />

      {/* 投函ショートカット */}
      <Link
        href="/post"
        className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-coral-600"
      >
        <IconMailbox size={18} stroke={2} />
        <span className="hidden sm:inline">投函する</span>
        <span className="sm:hidden">投函</span>
      </Link>

      {realMode && status === "authed" && (
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="ログアウト"
          title="ログアウト"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/60 hover:bg-black/[0.05]"
        >
          <IconLogout size={20} stroke={1.75} />
        </button>
      )}
    </header>
  );
}
