"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** サイドバー内の縦並びナビ */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** モバイル下部の横並びタブ */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
              active ? "text-coral" : "text-ink/55",
            ].join(" ")}
          >
            <Icon size={22} stroke={active ? 2 : 1.6} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
