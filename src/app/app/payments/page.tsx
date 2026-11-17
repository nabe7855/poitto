import { PageHeader } from "@/components/ui/page-header";
import { PaymentsClient } from "@/components/payments/payments-client";

export const metadata = { title: "支払い" };

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="支払い"
        description="請求書の支払い忘れを防ぎます。期限の近い順に並んでいます。"
      />
      <PaymentsClient />
    </>
  );
}
