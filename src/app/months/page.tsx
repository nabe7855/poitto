import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export const metadata = { title: "月別一覧" };

export default function MonthsPage() {
  return (
    <>
      <PageHeader
        title="月別一覧"
        description="月ごとの件数・合計金額と、保存済みの証憑を確認します。"
      />
      <PlaceholderPanel
        title="月別ビュー"
        note="月セレクタと、その月の件数・合計・一覧を表示します。"
      />
    </>
  );
}
