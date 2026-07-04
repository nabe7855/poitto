import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export const metadata = { title: "検索" };

export default function SearchPage() {
  return (
    <>
      <PageHeader
        title="検索"
        description="日付・金額・取引先で、証憑をすばやく探します。"
      />
      <PlaceholderPanel
        title="証憑一覧・検索"
        note="日付や金額の範囲、取引先名などの複合条件で絞り込み、CSV出力もできます。"
      />
    </>
  );
}
