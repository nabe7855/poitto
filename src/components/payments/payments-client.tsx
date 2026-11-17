"use client";

import { useMemo, useState } from "react";
import {
  IconCircleCheck,
  IconConfetti,
  IconHistory,
  IconChevronDown,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import { useDocuments } from "@/lib/store/documents-store";
import {
  BUCKET_META,
  bucketOf,
  effectivePayment,
  isPayable,
  paymentSummary,
  todayIso,
  type PaymentBucket,
} from "@/lib/payments";
import { formatDateJp, formatYen } from "@/lib/format";
import { DocumentDetail } from "@/components/documents/document-detail";
import { DueDateSetter, PaymentChip, useUndoToast } from "./parts";

const ORDER: PaymentBucket[] = ["overdue", "soon", "later", "nodate", "auto"];

const HEAD_TONE: Record<PaymentBucket, string> = {
  overdue: "text-coral",
  soon: "text-amber",
  later: "text-ink/70",
  nodate: "text-ink/70",
  auto: "text-ink/70",
};

export function PaymentsClient() {
  const { documents, paymentsEnabled, loadState, setPayment, bulkSetPayment } =
    useDocuments();
  const toast = useUndoToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [showUnknown, setShowUnknown] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => paymentSummary(documents), [documents]);
  const groups = useMemo(() => {
    const g: Record<PaymentBucket, DocumentRecord[]> = {
      overdue: [],
      soon: [],
      later: [],
      nodate: [],
      auto: [],
    };
    for (const d of documents) {
      const b = bucketOf(d);
      if (b) g[b].push(d);
    }
    for (const k of ORDER) {
      g[k].sort((a, b) => ((a.dueDate ?? "9999") < (b.dueDate ?? "9999") ? -1 : 1));
    }
    return g;
  }, [documents]);
  const history = useMemo(
    () =>
      documents
        .filter((d) => {
          const e = effectivePayment(d);
          return isPayable(d) && (e === "paid" || e === "auto_paid");
        })
        .sort((a, b) =>
          (a.paidAt ?? a.dueDate ?? "") < (b.paidAt ?? b.dueDate ?? "") ? 1 : -1,
        ),
    [documents],
  );
  const opened = documents.find((d) => d.id === openId) ?? null;

  if (!paymentsEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-sm text-ink/50">
        {loadState === "ready"
          ? "支払い管理は準備中です。もうしばらくお待ちください。"
          : "読み込み中…"}
      </div>
    );
  }

  const selectedDocs = documents.filter((d) => selected.has(d.id));
  const selectedTotal = selectedDocs.reduce((s, d) => s + (d.amountInclTax ?? 0), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function markPaid(d: DocumentRecord) {
    const prev = { paymentStatus: d.paymentStatus ?? null, paidAt: d.paidAt ?? null };
    setBusyId(d.id);
    setError(null);
    try {
      await setPayment(d.id, { paymentStatus: "paid", paidAt: todayIso() });
      setSelected((s) => {
        const n = new Set(s);
        n.delete(d.id);
        return n;
      });
      toast.show(`${d.partnerName ?? "請求書"}を支払い済みにしました`, () => {
        setPayment(d.id, prev).catch(() =>
          setError("元に戻せませんでした。詳細画面から未払いに戻してください。"),
        );
      });
    } catch {
      setError("保存できませんでした。通信状況を確認して、もう一度お試しください。");
    } finally {
      setBusyId(null);
    }
  }

  async function markSelectedPaid() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusyId("bulk");
    setError(null);
    try {
      const n = await bulkSetPayment(ids, { paymentStatus: "paid", paidAt: todayIso() });
      setSelected(new Set());
      toast.show(`${n}件を支払い済みにしました`, () => {
        bulkSetPayment(ids, { paymentStatus: "unpaid", paidAt: null }).catch(() =>
          setError("元に戻せませんでした。"),
        );
      });
    } catch {
      setError("まとめて保存できませんでした。もう一度お試しください。");
    } finally {
      setBusyId(null);
    }
  }

  async function settleAllUnknown() {
    const ids = summary.unknown.map((d) => d.id);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `支払い管理を始める前からある請求書 ${ids.length}件を「支払い済み」にします。\n（あとから1件ずつ「未払い」に戻せます）`,
      )
    ) {
      return;
    }
    setBusyId("unknown");
    setError(null);
    try {
      const n = await bulkSetPayment(ids, { paymentStatus: "paid", paidAt: null });
      toast.show(`${n}件を支払い済みにしました`);
      setShowUnknown(false);
    } catch {
      setError("まとめて保存できませんでした。もう一度お試しください。");
    } finally {
      setBusyId(null);
    }
  }

  const total = summary.unpaid.length;

  return (
    <div className="space-y-5">
      {/* 合計 */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 md:p-5">
        <div>
          <p className="text-xs text-ink/55">未払いの請求書</p>
          <p className="mt-0.5 font-bold text-ink">
            <span className="text-2xl">{total}</span>
            <span className="ml-1 text-sm">件</span>
            <span className="ml-3 text-lg">{formatYen(summary.unpaidTotal)}</span>
          </p>
        </div>
        {summary.overdue.length > 0 && (
          <p className="rounded-full bg-coral px-3 py-1 text-xs font-bold text-white">
            期限切れ {summary.overdue.length}件
          </p>
        )}
      </div>

      {/* 導入前からある請求書の整理（警告の嵐にしないため、未確認として別枠） */}
      {summary.unknown.length > 0 && (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
          <p className="flex items-start gap-2 text-sm text-ink/80">
            <IconInfoCircle size={18} stroke={1.75} className="mt-0.5 shrink-0 text-ink/50" />
            <span>
              支払い管理を始める前からある請求書が
              <span className="mx-1 font-bold text-ink">{summary.unknown.length}件</span>
              あります。支払い状況が分からないので、警告は出していません。
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyId !== null}
              onClick={settleAllUnknown}
              className="inline-flex items-center gap-1.5 rounded-full bg-mint px-4 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-95 disabled:opacity-40"
            >
              <IconCircleCheck size={14} stroke={2} />
              すべて支払い済みにする
            </button>
            <button
              type="button"
              onClick={() => setShowUnknown((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-medium text-ink/70 hover:bg-black/[0.03]"
            >
              1件ずつ確認する
              <IconChevronDown
                size={14}
                className={showUnknown ? "rotate-180 transition-transform" : "transition-transform"}
              />
            </button>
          </div>
          {showUnknown && (
            <div className="mt-3 divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.06]">
              {summary.unknown.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenId(d.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm text-ink/85">{d.partnerName ?? "—"}</p>
                    <p className="text-xs text-ink/50">
                      {formatDateJp(d.transactionDate)} ・ {formatYen(d.amountInclTax)}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() =>
                      setPayment(d.id, { paymentStatus: "paid", paidAt: null }).catch(() =>
                        setError("保存できませんでした。"),
                      )
                    }
                    className="rounded-full bg-mint-50 px-3 py-1 text-xs font-bold text-mint hover:bg-mint-50/70"
                  >
                    支払済み
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() =>
                      setPayment(d.id, { paymentStatus: "unpaid" }).catch(() =>
                        setError("保存できませんでした。"),
                      )
                    }
                    className="rounded-full bg-coral-50 px-3 py-1 text-xs font-bold text-coral hover:bg-coral-50/70"
                  >
                    まだ払っていない
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-coral-50 px-4 py-2.5 text-sm text-coral">{error}</p>
      )}

      {/* 期限の近い順 */}
      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center">
          <IconConfetti size={28} stroke={1.5} className="mx-auto text-mint" />
          <p className="mt-2 text-sm font-medium text-ink/70">
            {loadState === "ready" ? "未払いの請求書はありません。" : "読み込み中…"}
          </p>
        </div>
      ) : (
        ORDER.filter((k) => groups[k].length > 0).map((k) => (
          <section key={k}>
            <h2 className={`mb-2 flex items-baseline gap-2 text-sm font-bold ${HEAD_TONE[k]}`}>
              {BUCKET_META[k].label}
              <span className="text-xs font-medium text-ink/45">
                {groups[k].length}件
                {BUCKET_META[k].hint && ` ・ ${BUCKET_META[k].hint}`}
              </span>
            </h2>
            <div
              className={[
                "divide-y divide-black/[0.06] overflow-hidden rounded-2xl border bg-white",
                k === "overdue" ? "border-coral/30" : "border-black/[0.06]",
              ].join(" ")}
            >
              {groups[k].map((d) => (
                <PaymentRow
                  key={d.id}
                  doc={d}
                  checked={selected.has(d.id)}
                  onToggle={() => toggle(d.id)}
                  onOpen={() => setOpenId(d.id)}
                  onPaid={() => markPaid(d)}
                  busy={busyId === d.id || busyId === "bulk"}
                  onSetDue={(iso) =>
                    setPayment(d.id, { dueDate: iso }).catch(() =>
                      setError("期日を保存できませんでした。"),
                    )
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      {/* 支払済みの履歴 */}
      {history.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink"
          >
            <IconHistory size={16} stroke={1.75} />
            支払済みの履歴（{history.length}件）
            <IconChevronDown
              size={14}
              className={showHistory ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>
          {showHistory && (
            <div className="mt-2 divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
              {history.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenId(d.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm text-ink/80">{d.partnerName ?? "—"}</p>
                    <p className="text-xs text-ink/45">{formatYen(d.amountInclTax)}</p>
                  </button>
                  <PaymentChip doc={d} size="sm" />
                  {effectivePayment(d) === "paid" && (
                    <button
                      type="button"
                      onClick={() =>
                        setPayment(d.id, { paymentStatus: "unpaid", paidAt: null }).catch(() =>
                          setError("保存できませんでした。"),
                        )
                      }
                      className="text-xs font-medium text-ink/45 hover:underline"
                    >
                      未払いに戻す
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* まとめて消し込み */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
          <div className="flex max-w-xl flex-1 flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-lg">
            <span className="flex-1 text-sm text-ink/80">
              <span className="font-bold text-ink">{selected.size}件</span> 選択中 ・{" "}
              {formatYen(selectedTotal)}
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-ink/50 hover:underline"
            >
              選択を解除
            </button>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={markSelectedPaid}
              className="inline-flex items-center gap-1.5 rounded-full bg-mint px-4 py-2 text-xs font-bold text-white hover:brightness-95 disabled:opacity-40"
            >
              <IconCircleCheck size={14} stroke={2} />
              まとめて支払い済みにする
            </button>
          </div>
        </div>
      )}

      {opened && <DocumentDetail doc={opened} onClose={() => setOpenId(null)} />}
      {toast.node}
    </div>
  );
}

function PaymentRow({
  doc,
  checked,
  onToggle,
  onOpen,
  onPaid,
  onSetDue,
  busy,
}: {
  doc: DocumentRecord;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onPaid: () => void;
  onSetDue: (iso: string | null) => void;
  busy: boolean;
}) {
  const nodate = !doc.dueDate;
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="checkbox"
          aria-label="選択"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-mint"
        />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-ink/90">{doc.partnerName ?? "—"}</p>
          <p className="mt-0.5 text-xs text-ink/50">
            {formatYen(doc.amountInclTax)}
            {doc.status === "review" && <span className="ml-2 text-amber">要確認</span>}
          </p>
        </button>
        <PaymentChip doc={doc} />
        <button
          type="button"
          disabled={busy}
          onClick={onPaid}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-mint/40 bg-white px-3 py-1.5 text-xs font-bold text-mint transition-colors hover:bg-mint-50 disabled:opacity-40"
        >
          <IconCircleCheck size={14} stroke={2} />
          支払い済みにする
        </button>
      </div>
      {nodate && (
        <div className="mt-2 pl-7">
          <DueDateSetter value={doc.dueDate} disabled={busy} onSet={onSetDue} />
        </div>
      )}
    </div>
  );
}
