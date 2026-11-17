"use client";

import { useState } from "react";
import type { DocumentRecord, PaymentMethod } from "@/lib/types";
import { useDocuments, type PaymentPatch } from "@/lib/store/documents-store";
import {
  effectivePayment,
  isPayable,
  METHOD_LABEL,
  todayIso,
} from "@/lib/payments";
import { CalendarButtons, DueDateSetter, PaymentChip } from "./parts";

/** 証憑詳細の「支払い」欄。状況・期日・支払日・方法をその場で直せる */
export function PaymentPanel({ doc }: { doc: DocumentRecord }) {
  const { paymentsEnabled, setPayment } = useDocuments();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 領収書・見積書など支払い対象外は表示しない（請求書と、未払いにしたものだけ）
  if (!paymentsEnabled || !isPayable(doc)) return null;

  const eff = effectivePayment(doc);
  const paid = eff === "paid" || eff === "auto_paid";

  async function save(patch: PaymentPatch) {
    setBusy(true);
    setError(null);
    try {
      await setPayment(doc.id, patch);
    } catch {
      setError("保存できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  const seg = (active: boolean) =>
    [
      "flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40",
      active ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink/80",
    ].join(" ");

  return (
    <div className="rounded-xl border border-black/[0.06] bg-background-soft p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink/70">支払い</p>
        <PaymentChip doc={doc} />
      </div>

      {/* 未払い／支払済み */}
      <div className="flex gap-1 rounded-xl bg-black/[0.05] p-1">
        <button
          type="button"
          disabled={busy}
          className={seg(eff === "unpaid" || eff === "unknown")}
          onClick={() => save({ paymentStatus: "unpaid", paidAt: null })}
        >
          未払い
        </button>
        <button
          type="button"
          disabled={busy}
          className={seg(paid)}
          onClick={() => save({ paymentStatus: "paid", paidAt: doc.paidAt ?? todayIso() })}
        >
          支払済み
        </button>
      </div>

      <dl className="mt-3 space-y-2.5 text-sm">
        <div>
          <dt className="mb-1 text-xs text-ink/50">支払期日</dt>
          <dd>
            <DueDateSetter
              value={doc.dueDate}
              disabled={busy}
              onSet={(iso) => save({ dueDate: iso })}
            />
          </dd>
        </div>
        {paid && eff !== "auto_paid" && (
          <div>
            <dt className="mb-1 text-xs text-ink/50">支払日</dt>
            <dd>
              <input
                type="date"
                aria-label="支払日"
                disabled={busy}
                value={doc.paidAt ?? ""}
                onChange={(e) => save({ paidAt: e.target.value || null })}
                className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
              />
            </dd>
          </div>
        )}
        <div>
          <dt className="mb-1 text-xs text-ink/50">支払方法</dt>
          <dd>
            <select
              aria-label="支払方法"
              disabled={busy}
              value={doc.paymentMethod ?? ""}
              onChange={(e) =>
                save({ paymentMethod: (e.target.value || null) as PaymentMethod | null })
              }
              className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            >
              <option value="">未設定</option>
              {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </select>
            {(doc.paymentMethod === "debit" || doc.paymentMethod === "card") && (
              <p className="mt-1 text-[11px] text-ink/45">
                引落日（支払期日）を過ぎると、自動で支払済みとして扱います。
              </p>
            )}
          </dd>
        </div>
      </dl>

      {!paid && doc.dueDate && (
        <div className="mt-3">
          <CalendarButtons doc={doc} />
        </div>
      )}
      {error && <p className="mt-2 text-xs text-coral">{error}</p>}
    </div>
  );
}
