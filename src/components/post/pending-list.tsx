"use client";

import { useState } from "react";
import {
  IconFileText,
  IconLoader2,
  IconAlertTriangle,
  IconTrash,
} from "@tabler/icons-react";
import { useDocuments } from "@/lib/store/documents-store";
import { formatBytes } from "@/lib/format";

/**
 * 未完了（処理中・エラー）の証憑一覧。
 * ストア（＝サーバー）由来なので、画面を移動して戻っても保持される。
 * 抽出中は自動更新され、完了すると一覧から消えて月別一覧へ保存される。
 */
export function PendingList() {
  const { documents, deleteDocument } = useDocuments();
  const extracting = documents.filter((d) => d.status === "extracting");
  const errored = documents.filter((d) => d.status === "error");
  const total = extracting.length + errored.length;

  if (total === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-black/[0.06] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold text-ink">処理状況</h2>
        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs font-medium text-ink/60">
          未完了 {total} 件
        </span>
      </div>

      <div className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.06]">
        {extracting.map((d) => (
          <ProcessingRow key={d.id} size={d.sizeBytes} />
        ))}
        {errored.map((d) => (
          <ErrorRow
            key={d.id}
            size={d.sizeBytes}
            onDelete={() => deleteDocument(d.id)}
          />
        ))}
      </div>

      <p className="mt-2.5 text-xs text-ink/45">
        処理中のものは完了すると自動でこの一覧から消え、
        <span className="font-medium text-ink/60">月別一覧</span>
        に保存されます（画面を移動しても大丈夫です）。
      </p>
    </section>
  );
}

function ProcessingRow({ size }: { size: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral">
        <IconFileText size={18} stroke={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink/85">
          AIが読み取り中の証憑
        </p>
        <p className="mt-0.5 text-xs text-ink/50">{formatBytes(size)}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-xs font-bold text-coral">
        <IconLoader2 size={14} className="animate-spin" />
        処理中
      </span>
    </div>
  );
}

function ErrorRow({
  size,
  onDelete,
}: {
  size: number;
  onDelete: () => void | Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-start gap-3 bg-coral-50/40 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral">
        <IconAlertTriangle size={18} stroke={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm text-ink/85">読み取りに失敗した証憑</p>
          <span className="shrink-0 rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white">
            エラー
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink/50">{formatBytes(size)}</p>
        <p className="mt-1 text-xs text-ink/55">
          AIの読み取りに失敗しました。お手数ですが、もう一度投函し直してください。
        </p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-coral transition-colors hover:bg-coral-50 disabled:opacity-50"
      >
        <IconTrash size={13} stroke={1.75} />
        {deleting ? "削除中…" : "削除"}
      </button>
    </div>
  );
}
