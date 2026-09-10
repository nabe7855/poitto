import { PageHeader } from "@/components/ui/page-header";
import { ReviewClient } from "@/components/review/review-client";

export const metadata = { title: "確認キュー" };

export default function ReviewPage() {
  return (
    <>
      <PageHeader
        title="確認キュー"
        description="AIの確信度が低い項目を確認・修正して、保存を確定します。"
      />
      <ReviewClient />
    </>
  );
}
