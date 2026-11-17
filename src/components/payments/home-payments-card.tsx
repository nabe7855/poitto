"use client";

import Link from "next/link";
import { IconAlarm, IconArrowRight } from "@tabler/icons-react";
import { useDocuments } from "@/lib/store/documents-store";
import { paymentSummary } from "@/lib/payments";
import { formatYen } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { PaymentChip } from "./parts";

/** ホーム最上段：期限切れ・7日以内の支払い（無ければ何も出さない） */
export function HomePaymentsCard() {
  const { documents, paymentsEnabled, loadState } = useDocuments();
  if (!paymentsEnabled || loadState !== "ready") return null;

  const { overdue, soon } = paymentSummary(documents);
  const items = [...overdue, ...soon];
  if (items.length === 0) return null;
  const total = items.reduce((s, d) => s + (d.amountInclTax ?? 0), 0);
  const urgent = overdue.length > 0;

  return (
    <div
      className={[
        "mb-4 rounded-2xl border bg-white p-4 md:p-5",
        urgent ? "border-coral/40" : "border-amber/40",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <IconAlarm size={18} stroke={2} className={urgent ? "text-coral" : "text-amber"} />
          {urgent ? "支払期限を過ぎた請求書があります" : "まもなく支払期日の請求書"}
          <span className="font-medium text-ink/55">
            {items.length}件 ・ {formatYen(total)}
          </span>
        </p>
        <Link
          href={ROUTES.payments}
          className="inline-flex items-center gap-1 text-sm font-medium text-coral hover:underline"
        >
          支払いを確認
          <IconArrowRight size={16} stroke={2} />
        </Link>
      </div>
      <ul className="divide-y divide-black/[0.05]">
        {items.slice(0, 4).map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-ink/85">
              {d.partnerName ?? "—"}
            </span>
            <span className="shrink-0 text-sm font-medium text-ink/70">
              {formatYen(d.amountInclTax)}
            </span>
            <PaymentChip doc={d} size="sm" />
          </li>
        ))}
      </ul>
      {items.length > 4 && (
        <p className="mt-1 text-xs text-ink/45">ほか {items.length - 4}件</p>
      )}
    </div>
  );
}
