import {
  IconHome,
  IconMailbox,
  IconListCheck,
  IconCalendarMonth,
  IconSearch,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";

export type NavItem = {
  href: string;
  label: string;
  /** 下部タブ用の短縮ラベル（省略時は label） */
  shortLabel?: string;
  icon: Icon;
  /** 要確認件数などのバッジを出すキー */
  badge?: "review";
};

/** サイドバー／モバイルタブ共通のナビ項目 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: IconHome },
  { href: "/post", label: "投函", icon: IconMailbox },
  { href: "/review", label: "確認", icon: IconListCheck, badge: "review" },
  { href: "/months", label: "月別一覧", shortLabel: "月別", icon: IconCalendarMonth },
  { href: "/search", label: "検索", icon: IconSearch },
  { href: "/settings", label: "設定", icon: IconSettings },
];
