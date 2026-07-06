"use client";

import { useState } from "react";
import {
  IconX,
  IconFileText,
  IconDownload,
  IconEye,
  IconFileTypeCsv,
  IconDeviceFloppy,
  IconTrash,
  IconAlertTriangle,
} from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import {
  displayName,
  docTypeLabel,
  formatDateJp,
  formatYen,
} from "@/lib/format";
import { StatusBadge } from "@/components/ui/badges";
import { VoiceMemoField } from "@/components/review/voice-memo-field";
import { TagEditor } from "@/components/documents/tag-editor";
import { DocumentPreview } from "@/components/documents/document-preview";
import { useDocuments } from "@/lib/store/documents-store";
import { duplicatesOf } from "@/lib/duplicates";
import { documentsToCsv, csvWithBom } from "@/lib/csv";
import { downloadCsv, downloadBlob } from "@/lib/download";
import { formatJpyCost } from "@/lib/ai-cost"; // [COST-DEBUG] ★本番前に削除★

/** 証憑の詳細モーダル。メモの後付け編集と、1件ごとのダウンロードができる。 */
export function DocumentDetail({
  doc,
  onClose,
}: {
  doc: DocumentRecord;
  onClose: () => void;
}) {
  const { documents, setMemo, getOriginalBlob, deleteDocument } = useDocuments();
  const dups = duplicatesOf(doc, documents);
  const [memo, setMemoLocal] = useState(doc.memo ?? "");
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  async function onDelete() {
    if (
      !window.confirm(
        "この証憑をゴミ箱へ移動します。設定のゴミ箱から復元できます。よろしいですか？",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteDocument(doc.id);
      onClose();
    } catch {
      setDeleting(false);
      window.alert("削除に失敗しました。時間をおいて再度お試しください。");
    }
  }

  function saveMemo() {
    setMemo(doc.id, memo.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  async function downloadOriginal() {
    setDownloading(true);
    setDlError(false);
    try {
      const blob = await getOriginalBlob(doc.id);
      if (!blob) {
        setDlError(true);
        return;
      }
      downloadBlob(blob, doc.fileName ?? `${doc.id}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  function downloadDocCsv() {
    const name = (doc.fileName ?? doc.id).replace(/\.[^.]+$/, "");
    downloadCsv(csvWithBom(documentsToCsv([{ ...doc, memo }])), `${name}.csv`);
  }

  const dirty = (doc.memo ?? "") !== memo;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="証憑の詳細"
        className="relative flex max-h-[90vh] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:m-4 sm:rounded-2xl"
      >
        {/* ヘッダー */}
        <div className="flex items-start gap-3 border-b border-black/[0.06] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral">
            <IconFileText size={20} stroke={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm text-ink/85">
              {displayName(doc)}
            </p>
            <div className="mt-1">
              <StatusBadge status={doc.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-black/[0.05]"
          >
            <IconX size={20} stroke={1.75} />
          </button>
        </div>

        {/* 本文 */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* 重複の可能性（やわらかい警告） */}
          {dups.length > 0 && (
            <div className="rounded-xl border border-amber/30 bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber">
                <IconAlertTriangle size={16} stroke={2} />
                重複の可能性があります
              </p>
              <p className="mt-1 text-xs text-ink/60">
                同じ「取引年月日・取引先・税込金額・種別」の証憑が {dups.length}{" "}
                件あります。二重登録でなければそのままでOKです。
              </p>
              <ul className="mt-2 space-y-1">
                {dups.map((d) => (
                  <li
                    key={d.id}
                    className="truncate font-mono text-xs text-ink/70"
                  >
                    ・{displayName(d)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <dl className="grid grid-cols-3 gap-y-2.5 text-sm">
            <Row label="取引年月日" value={formatDateJp(doc.transactionDate)} />
            <Row label="取引先" value={doc.partnerName ?? "—"} />
            <Row label="税込金額" value={formatYen(doc.amountInclTax)} />
            <Row label="種別" value={docTypeLabel(doc.documentType)} />
            <Row label="登録番号" value={doc.registrationNumber ?? "—"} />
            <Row label="保存先" value={doc.storedPath ?? "—"} mono />
          </dl>

          {/* [COST-DEBUG] AI抽出の費用（★本番前に削除★） */}
          {doc.usage && (
            <div className="rounded-xl border border-amber/20 bg-amber-50/50 p-2.5 text-[11px] text-ink/60">
              🔧 AI抽出の費用（開発用）：
              <span className="font-bold text-ink">
                {formatJpyCost(doc.usage.estimatedCostJpy)}
              </span>{" "}
              （入力 {doc.usage.inputTokens.toLocaleString()} ／ 出力{" "}
              {doc.usage.outputTokens.toLocaleString()} トークン・
              {doc.usage.model}）
            </div>
          )}

          {/* 分類（部門・科目） */}
          <div>
            <p className="mb-1 text-xs font-medium text-ink/70">分類</p>
            <TagEditor doc={doc} defaultOpen />
          </div>

          {/* メモ（後付け編集可） */}
          <div className="rounded-xl border border-black/[0.06] bg-background-soft p-3">
            <VoiceMemoField value={memo} onChange={setMemoLocal} />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={saveMemo}
                disabled={!dirty}
                className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-coral-600 disabled:opacity-40"
              >
                <IconDeviceFloppy size={14} stroke={2} />
                メモを保存
              </button>
              {saved && (
                <span className="text-xs font-medium text-mint">保存しました</span>
              )}
            </div>
          </div>
        </div>

        {/* フッター: ダウンロード */}
        <div className="space-y-2 border-t border-black/[0.06] p-4">
          <button
            type="button"
            onClick={() => setPreviewing(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-mint px-4 py-2.5 text-sm font-bold text-white transition-colors hover:brightness-95"
          >
            <IconEye size={16} stroke={2} />
            原本をプレビュー
          </button>
          <button
            type="button"
            onClick={downloadOriginal}
            disabled={downloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-mint/40 bg-white px-4 py-2.5 text-sm font-medium text-mint transition-colors hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconDownload size={16} stroke={2} />
            {downloading ? "取得中…" : "原本をダウンロード"}
          </button>
          {dlError && (
            <p className="text-center text-[11px] text-coral">
              原本を取得できませんでした（保存直後は少し待って再度お試しください）。
            </p>
          )}
          <button
            type="button"
            onClick={downloadDocCsv}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-black/[0.03]"
          >
            <IconFileTypeCsv size={16} stroke={1.75} />
            この証憑のデータ（CSV）
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-coral transition-colors hover:bg-coral-50 disabled:opacity-50"
          >
            <IconTrash size={16} stroke={1.75} />
            {deleting ? "移動中…" : "ゴミ箱へ移動"}
          </button>
        </div>
      </div>

      {previewing && (
        <DocumentPreview doc={doc} onClose={() => setPreviewing(false)} />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="col-span-1 text-ink/50">{label}</dt>
      <dd className={`col-span-2 text-ink ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </>
  );
}
