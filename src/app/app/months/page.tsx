import { PageHeader } from "@/components/ui/page-header";
import { MonthsClient } from "@/components/months/months-client";

export const metadata = { title: "月別一覧" };

export default function MonthsPage() {
  return (
    <>
      <PageHeader
        title="月別一覧"
        description="月ごとの件数・合計金額と、保存済みの証憑を確認します。"
      />
      <MonthsClient />
    </>
  );
}
