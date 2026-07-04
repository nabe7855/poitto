"use client";

import Image from "next/image";
import Link from "next/link";
import { IconX } from "@tabler/icons-react";
import { SidebarNav } from "./nav-links";

export function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* オーバーレイ */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* ドロワー本体 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="メニュー"
        className={`absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col bg-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" onClick={onClose} aria-label="ポイッと ホーム">
            <Image
              src="/brand/logo/poitto_logo_horizontal.png"
              alt="ポイッと POITTO"
              width={128}
              height={30}
              className="h-7 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="メニューを閉じる"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/70 hover:bg-black/[0.05]"
          >
            <IconX size={22} stroke={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
