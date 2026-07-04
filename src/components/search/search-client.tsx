"use client";

import { useMemo, useState } from "react";
import { IconDownload, IconSearch, IconX } from "@tabler/icons-react";
import type { DocStatus, DocType } from "@/lib/types";
import { filterDocuments, sumAmount, type SearchFilters } from "@/lib/selectors";
import { useDocuments } from "@/lib/store/documents-store";
import { DocumentList } from "@/components/documents/document-list";
import { DOC_TYPE_LABEL, formatYen } from "@/lib/format";
import { documentsToCsv, csvWithBom } from "@/lib/csv";
import { downloadCsv } from "@/lib/download";

const TYPE_OPTIONS: { value: DocType | "all"; label: string }[] = [
  { value: "all", label: "すべての種別" },
  ...(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => ({
    value: t,
    label: DOC_TYPE_LABEL[t],
  })),
];

const STATUS_OPTIONS: { value: DocStatus | "all"; label: string }[] = [
  { value: "all", label: "すべての状態" },
  { value: "stored", label: "保存済み" },
  { value: "review", label: "要確認" },
  { value: "extracting", label: "抽出中" },
];

const EMPTY: SearchFilters = {
  from: "",
  to: "",
  partner: "",
  type: "all",
  status: "all",
};

export function SearchClient() {
  const { documents } = useDocuments();
  const [f, setF] = useState<SearchFilters & { amountMinStr?: string; amountMaxStr?: string }>(
    EMPTY,
  );

  const results = useMemo(() => {
    return filterDocuments(
      {
        from: f.from || undefined,
        to: f.to || undefined,
        amountMin: f.amountMinStr ? Number(f.amountMinStr) : undefined,
        amountMax: f.amountMaxStr ? Number(f.amountMaxStr) : undefined,
        partner: f.partner || undefined,
        type: f.type,
        status: f.status,
      },
      documents,
    );
  }, [f, documents]);

  const total = sumAmount(results);

  function handleCsvDownload() {
    downloadCsv(csvWithBom(documentsToCsv(results)), "poitto_証憑一覧.csv");
  }

  const inputCls =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-coral focus:ring-2 focus:ring-coral/20";

  return (
    <div className="space-y-5">
      {/* 検索条件 */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 取引先 */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1 block text-xs font-medium text-ink/70">
              取引先（部分一致）
            </label>
            <input
              type="text"
              placeholder="例：佐川"
              value={f.partner}
              onChange={(e) => setF({ ...f, partner: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* 取引年月日 範囲 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">
              取引年月日
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={f.from}
                onChange={(e) => setF({ ...f, from: e.target.value })}
                className={inputCls}
              />
              <span className="text-ink/40">〜</span>
              <input
                type="date"
                value={f.to}
                onChange={(e) => setF({ ...f, to: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* 金額範囲 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">
              税込金額（円）
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                placeholder="下限"
                value={f.amountMinStr ?? ""}
                onChange={(e) => setF({ ...f, amountMinStr: e.target.value })}
                className={inputCls}
              />
              <span className="text-ink/40">〜</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="上限"
                value={f.amountMaxStr ?? ""}
                onChange={(e) => setF({ ...f, amountMaxStr: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* 種別 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">
              書類の種類
            </label>
            <select
              value={f.type}
              onChange={(e) =>
                setF({ ...f, type: e.target.value as DocType | "all" })
              }
              className={inputCls}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* 状態 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">
              状態
            </label>
            <select
              value={f.status}
              onChange={(e) =>
                setF({ ...f, status: e.target.value as DocStatus | "all" })
              }
              className={inputCls}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setF(EMPTY)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-black/[0.03]"
          >
            <IconX size={16} stroke={2} />
            条件をクリア
          </button>
        </div>
      </div>

      {/* 結果ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-ink/70">
          <IconSearch size={16} stroke={2} className="text-ink/40" />
          <span className="font-bold text-ink">{results.length}</span> 件 ／ 合計{" "}
          <span className="font-bold text-ink">{formatYen(total)}</span>
        </p>
        <button
          type="button"
          onClick={handleCsvDownload}
          disabled={results.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconDownload size={16} stroke={2} />
          CSV出力
        </button>
      </div>

      {/* 結果一覧 */}
      <DocumentList
        documents={results}
        showStatus
        emptyText="条件に一致する証憑がありません。"
      />
    </div>
  );
}
