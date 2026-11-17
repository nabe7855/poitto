"use client";

import { useState } from "react";
import { IconAlarm, IconCircleCheck, IconReceipt } from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import { useDocuments } from "@/lib/store/documents-store";
import {
  dueRelative,
  effectivePayment,
  formatDueShort,
  isAutoMethod,
  isPayable,
  METHOD_LABEL,
  todayIso,
} from "@/lib/payments";
import { formatYen } from "@/lib/format";
import { CalendarButtons, DueDateSetter } from "./parts";

/**
 * 投函直後に出す支払いの案内。
 * 「保存しました」で終わったと思わせないよう、請求書なら「お支払いはまだです」を並べて表示する。
 */
export function PaymentQuick({ doc }: { doc: DocumentRecord }) {
  const { paymentsEnabled, setPayment } = useDocuments();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDue, setEditingDue] = useState(false);

  if (!paymentsEnabled || doc.status === "extracting" || doc.status === "error") return null;
  const eff = effectivePayment(doc);

  // 領収書: 支払い済みとして記録したことだけ控えめに伝える
  if (doc.documentType === "receipt" && eff === "paid") {
    return (
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink/50">
        <IconReceipt size={14} stroke={1.75} className="shrink-0 text-mint" />
        領収書なので、支払い済みとして記録しました。
      </p>
    );
  }
  if (!isPayable(doc)) return null;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError("保存できませんでした。通信状況を確認して、もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  if (eff === "paid" || eff === "auto_paid") {
    return (
      <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-mint-50 px-3 py-2 text-sm">
        <IconCircleCheck size={16} stroke={2} className="shrink-0 text-mint" />
        <span className="font-medium text-mint">
          支払い済みにしました{doc.paidAt ? `（${formatDueShort(doc.paidAt)}）` : ""}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => setPayment(doc.id, { paymentStatus: "unpaid", paidAt: null }))}
          className="text-xs font-medium text-ink/50 hover:underline disabled:opacity-40"
        >
          未払いに戻す
        </button>
      </div>
    );
  }

  const auto = isAutoMethod(doc.paymentMethod);
  const amount = doc.amountInclTax != null ? formatYen(doc.amountInclTax) : null;

  return (
    <div className="mt-2.5 rounded-xl border border-amber/30 bg-amber-50/60 p-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <IconAlarm size={17} stroke={2} className="shrink-0 text-amber" />
        {auto
          ? `${METHOD_LABEL[doc.paymentMethod ?? "debit"]}で支払われる予定です`
          : "お支払いはまだです"}
      </p>

      {doc.dueDate && !editingDue ? (
        <p className="mt-1 text-sm text-ink/75">
          期日 <span className="font-bold text-ink">{formatDueShort(doc.dueDate)}</span>
          <span className="ml-1.5 font-medium text-amber">{dueRelative(doc.dueDate)}</span>
          {amount && <span className="ml-2 text-ink/60">・ {amount}</span>}
          <button
            type="button"
            onClick={() => setEditingDue(true)}
            className="ml-2 text-xs font-medium text-ink/45 hover:underline"
          >
            期日が違う？
          </button>
        </p>
      ) : (
        <div className="mt-1.5">
          <p className="mb-1.5 text-xs text-ink/60">
            {doc.dueDate ? "支払期日を選んでください。" : "請求書から支払期日を読み取れませんでした。期日を設定してください。"}
            {amount && <span className="ml-1">（{amount}）</span>}
          </p>
          <DueDateSetter
            value={doc.dueDate}
            disabled={busy}
            onSet={(iso) =>
              run(async () => {
                await setPayment(doc.id, { dueDate: iso });
                setEditingDue(false);
              })
            }
          />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {!auto && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => setPayment(doc.id, { paymentStatus: "paid", paidAt: todayIso() }))
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-95 disabled:opacity-40"
          >
            <IconCircleCheck size={14} stroke={2} />
            支払い済みにする
          </button>
        )}
        <CalendarButtons doc={doc} />
      </div>
      {error && <p className="mt-1.5 text-xs text-coral">{error}</p>}
    </div>
  );
}
