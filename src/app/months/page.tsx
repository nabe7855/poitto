import { PageHeader } from "@/components/ui/page-header";
import { MonthsClient } from "@/components/months/months-client";
import {
  DEMO_MONTH,
  documentsInMonth,
  monthSummaries,
} from "@/lib/selectors";

export const metadata = { title: "月別一覧" };

export default function MonthsPage() {
  const summaries = monthSummaries();
  const documentsByMonth = Object.fromEntries(
    summaries.map((s) => [s.ym, documentsInMonth(s.ym)]),
  );

  return (
    <>
      <PageHeader
        title="月別一覧"
        description="月ごとの件数・合計金額と、保存済みの証憑を確認します。"
      />
      <MonthsClient
        summaries={summaries}
        documentsByMonth={documentsByMonth}
        defaultMonth={DEMO_MONTH}
      />
    </>
  );
}
