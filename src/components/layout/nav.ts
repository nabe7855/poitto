import {
  IconHome,
  IconMailbox,
  IconCalendarMonth,
  IconSearch,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
};

/** サイドバー／モバイルタブ共通のナビ項目 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: IconHome },
  { href: "/post", label: "投函", icon: IconMailbox },
  { href: "/months", label: "月別一覧", icon: IconCalendarMonth },
  { href: "/search", label: "検索", icon: IconSearch },
  { href: "/settings", label: "設定", icon: IconSettings },
];
