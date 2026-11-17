"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAlarm, IconArrowRight } from "@tabler/icons-react";
import { useDocuments } from "@/lib/store/documents-store";
import { paymentSummary } from "@/lib/payments";
import { formatYen } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

/**
 * 支払期限を過ぎた請求書があるあいだ、どの画面でも出し続ける帯。
 * （ホームは専用カード、支払い画面は一覧そのものがあるので出さない）
 */
export function PaymentAlertBanner() {
  const { documents, paymentsEnabled, loadState } = useDocuments();
  const pathname = usePathname();
  if (!paymentsEnabled || loadState !== "ready") return null;
  if (pathname === ROUTES.home || pathname.startsWith(ROUTES.payments)) return null;

  const { overdue } = paymentSummary(documents);
  if (overdue.length === 0) return null;
  const total = overdue.reduce((s, d) => s + (d.amountInclTax ?? 0), 0);

  return (
    <Link
      href={ROUTES.payments}
      className="mb-4 flex items-center gap-3 rounded-xl bg-coral px-4 py-3 text-sm text-white transition-colors hover:bg-coral-600"
    >
      <IconAlarm size={18} stroke={2} className="shrink-0" />
      <span className="flex-1 font-medium">
        支払期限を過ぎた請求書が {overdue.length}件（{formatYen(total)}）あります
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold">
        確認する
        <IconArrowRight size={14} stroke={2} />
      </span>
    </Link>
  );
}
