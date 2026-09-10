import { PageHeader } from "@/components/ui/page-header";
import { SearchClient } from "@/components/search/search-client";

export const metadata = { title: "検索" };

export default function SearchPage() {
  return (
    <>
      <PageHeader
        title="検索"
        description="日付・金額・取引先で、証憑をすばやく探します。"
      />
      <SearchClient />
    </>
  );
}
