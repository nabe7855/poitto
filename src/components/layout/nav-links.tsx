"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, type NavItem } from "./nav";
import { ROUTES } from "@/lib/routes";
import { useDocuments } from "@/lib/store/documents-store";
import { paymentSummary } from "@/lib/payments";

/** 表示する項目と、各バッジの件数・色 */
function useNav() {
  const { documents, paymentsEnabled } = useDocuments();
  return useMemo(() => {
    const items = NAV_ITEMS.filter(
      (i) => i.requires !== "payments" || paymentsEnabled,
    );
    const review = documents.filter((d) => d.status === "review").length;
    const pay = paymentsEnabled ? paymentSummary(documents) : null;
    const badgeOf = (item: NavItem): { count: number; tone: string } | null => {
      if (item.badge === "review" && review > 0)
        return { count: review, tone: "bg-amber" };
      if (item.badge === "payments" && pay && pay.alertCount > 0)
        return {
          count: pay.alertCount,
          // 期限切れがあれば強い色
          tone: pay.overdue.length > 0 ? "bg-coral" : "bg-amber",
        };
      return null;
    };
    return { items, badgeOf };
  }, [documents, paymentsEnabled]);
}

function isActive(pathname: string, href: string) {
  // ホーム（/app）は他の全ページの接頭辞なので、完全一致でしか光らせない
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** サイドバー内の縦並びナビ */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { items, badgeOf } = useNav();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const { href, label, icon: Icon } = item;
        const active = isActive(pathname, href);
        const badge = badgeOf(item);
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
            {badge && (
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white ${badge.tone}`}
              >
                {badge.count}
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
  const { items, badgeOf } = useNav();

  return (
    <nav
      className="grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const { href, label, shortLabel, icon: Icon } = item;
        const active = isActive(pathname, href);
        const badge = badgeOf(item);
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
              {badge && (
                <span
                  className={`absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${badge.tone}`}
                >
                  {badge.count}
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
