import {
  IconHome,
  IconMailbox,
  IconListCheck,
  IconCalendarMonth,
  IconSearch,
  IconSettings,
  IconCash,
  type Icon,
} from "@tabler/icons-react";
import { ROUTES } from "@/lib/routes";

export type NavItem = {
  href: string;
  label: string;
  /** 下部タブ用の短縮ラベル（省略時は label） */
  shortLabel?: string;
  icon: Icon;
  /** 要確認件数などのバッジを出すキー */
  badge?: "review" | "payments";
  /** サーバーが対応したときだけ表示する機能 */
  requires?: "payments";
};

/** サイドバー／モバイルタブ共通のナビ項目 */
export const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.home, label: "ホーム", icon: IconHome },
  { href: ROUTES.post, label: "投函", icon: IconMailbox },
  { href: ROUTES.review, label: "確認", icon: IconListCheck, badge: "review" },
  {
    href: ROUTES.payments,
    label: "支払い",
    icon: IconCash,
    badge: "payments",
    requires: "payments",
  },
  { href: ROUTES.months, label: "月別一覧", shortLabel: "月別", icon: IconCalendarMonth },
  { href: ROUTES.search, label: "検索", icon: IconSearch },
  { href: ROUTES.settings, label: "設定", icon: IconSettings },
];
