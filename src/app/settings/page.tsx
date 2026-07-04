import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export const metadata = { title: "設定" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="設定"
        description="アカウント・命名ルール・エクスポートなどの設定。"
      />
      <PlaceholderPanel
        title="設定"
        note="組織情報、命名ルール、保存先、書き出しなどを設定します。"
      />
    </>
  );
}
