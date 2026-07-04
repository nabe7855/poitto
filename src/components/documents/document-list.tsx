"use client";

import { useMemo, useState } from "react";
import { IconFileText, IconNote, IconCopy } from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import {
  displayName,
  formatDateJp,
  formatYen,
} from "@/lib/format";
import { DocTypeBadge, StatusBadge } from "@/components/ui/badges";
import { DocumentDetail } from "./document-detail";
import { useDocuments } from "@/lib/store/documents-store";
import { duplicateIdSet } from "@/lib/duplicates";

/** 証憑の一覧（レスポンシブなリスト行）。行クリックで詳細（メモ編集・個別DL）を開く。 */
export function DocumentList({
  documents,
  showStatus = false,
  emptyText = "証憑がありません。",
}: {
  documents: DocumentRecord[];
  showStatus?: boolean;
  emptyText?: string;
}) {
  const { documents: allDocs } = useDocuments();
  const dupIds = useMemo(() => duplicateIdSet(allDocs), [allDocs]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = documents.find((d) => d.id === selectedId) ?? null;

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-sm text-ink/50">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
      {documents.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => setSelectedId(d.id)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.015]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral">
            <IconFileText size={18} stroke={1.75} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm text-ink/85">
              {displayName(d)}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-ink/50">
              <span className="truncate">{d.partnerName ?? "—"}</span>
              <DocTypeBadge type={d.documentType} />
              {dupIds.has(d.id) && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber">
                  <IconCopy size={11} stroke={2} />
                  重複の可能性
                </span>
              )}
            </p>
            {d.memo && (
              <p className="mt-1 flex items-start gap-1 text-xs text-ink/45">
                <IconNote size={13} stroke={1.75} className="mt-0.5 shrink-0" />
                <span className="line-clamp-1">{d.memo}</span>
              </p>
            )}
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-sm font-bold text-ink">
              {formatYen(d.amountInclTax)}
            </p>
            <p className="mt-0.5 text-xs text-ink/50">
              {formatDateJp(d.transactionDate)}
            </p>
          </div>

          {showStatus && (
            <div className="shrink-0">
              <StatusBadge status={d.status} />
            </div>
          )}
        </button>
      ))}

      {selected && (
        <DocumentDetail doc={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
