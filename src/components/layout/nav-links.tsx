"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { useDocuments } from "@/lib/store/documents-store";

function useReviewCount() {
  const { documents } = useDocuments();
  return documents.filter((d) => d.status === "review").length;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** サイドバー内の縦並びナビ */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const REVIEW_COUNT = useReviewCount();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
        const active = isActive(pathname, href);
        const showBadge = badge === "review" && REVIEW_COUNT > 0;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-coral-50 text-coral"
                : "text-ink/70 hover:bg-black/[0.04] hover:text-ink",
            ].join(" ")}
          >
            <Icon size={20} stroke={1.75} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {showBadge && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1.5 text-xs font-bold text-white">
                {REVIEW_COUNT}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** モバイル下部の横並びタブ */
export function BottomNav() {
  const pathname = usePathname();
  const REVIEW_COUNT = useReviewCount();

  return (
    <nav className="grid grid-cols-6">
      {NAV_ITEMS.map(({ href, label, shortLabel, icon: Icon, badge }) => {
        const active = isActive(pathname, href);
        const showBadge = badge === "review" && REVIEW_COUNT > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              active ? "text-coral" : "text-ink/55",
            ].join(" ")}
          >
            <span className="relative">
              <Icon size={22} stroke={active ? 2 : 1.6} />
              {showBadge && (
                <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-white">
                  {REVIEW_COUNT}
                </span>
              )}
            </span>
            {shortLabel ?? label}
          </Link>
        );
      })}
    </nav>
  );
}
