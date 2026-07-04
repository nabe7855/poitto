import Image from "next/image";
import Link from "next/link";
import { SidebarNav } from "./nav-links";

/** デスクトップ用の固定サイドバー */
export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-black/[0.06] bg-white">
      <div className="flex h-16 items-center px-5">
        <Link href="/" className="inline-flex items-center" aria-label="ポイッと ホーム">
          <Image
            src="/brand/logo/poitto_logo_horizontal.png"
            alt="ポイッと POITTO"
            width={150}
            height={35}
            priority
            className="h-8 w-auto"
          />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav />
      </div>

      <div className="px-5 py-4">
        <p className="text-xs leading-relaxed text-ink/45">
          入れるだけで、
          <br />
          証憑がかたづく。
        </p>
      </div>
    </aside>
  );
}
