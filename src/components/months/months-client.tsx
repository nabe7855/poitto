"use client";

import { useMemo, useState } from "react";
import { IconFolder, IconCoin, IconFiles } from "@tabler/icons-react";
import { DocumentList } from "@/components/documents/document-list";
import { formatYen, monthLabel, storedPathOf } from "@/lib/format";
import { useDocuments } from "@/lib/store/documents-store";
import { DEMO_MONTH, documentsInMonth, monthSummaries } from "@/lib/selectors";

export function MonthsClient() {
  const { documents } = useDocuments();
  const summaries = useMemo(() => monthSummaries(documents), [documents]);
  const [ym, setYm] = useState<string | null>(null);

  const effectiveYm =
    ym && summaries.some((s) => s.ym === ym)
      ? ym
      : (summaries.find((s) => s.ym === DEMO_MONTH)?.ym ?? summaries[0]?.ym ?? "");

  if (summaries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-sm text-ink/50">
        保存済みの証憑がまだありません。
      </div>
    );
  }

  const current = summaries.find((s) => s.ym === effectiveYm) ?? summaries[0];
  const docs = documentsInMonth(effectiveYm, documents);

  return (
    <div className="space-y-5">
      {/* 月セレクタ */}
      <div className="flex flex-wrap gap-2">
        {summaries.map((s) => (
          <button
            key={s.ym}
            type="button"
            onClick={() => setYm(s.ym)}
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              s.ym === effectiveYm
                ? "bg-coral text-white"
                : "bg-white text-ink/70 ring-1 ring-black/10 hover:bg-black/[0.03]",
            ].join(" ")}
          >
            {monthLabel(s.ym)}
            <span className="ml-1.5 opacity-70">{s.count}</span>
          </button>
        ))}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-coral-50 text-coral">
            <IconFolder size={20} stroke={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-ink/50">
              {storedPathOf(effectiveYm)}
            </p>
            <p className="text-sm font-bold text-ink">{monthLabel(effectiveYm)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint-50 text-mint">
            <IconFiles size={20} stroke={1.75} />
          </span>
          <div>
            <p className="text-xs text-ink/50">件数</p>
            <p className="text-lg font-bold text-ink">{current.count} 件</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-ink">
            <IconCoin size={20} stroke={1.75} />
          </span>
          <div>
            <p className="text-xs text-ink/50">合計金額（税込）</p>
            <p className="text-lg font-bold text-ink">{formatYen(current.total)}</p>
          </div>
        </div>
      </div>

      {/* 一覧 */}
      <DocumentList documents={docs} />
    </div>
  );
}
