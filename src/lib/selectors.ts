import type { DocStatus, DocType, DocumentRecord } from "./types";
import { MOCK_DOCUMENTS } from "./mock-data";
import { monthKey } from "./format";

/** デモの基準月（受入基準が2026年6月のため） */
export const DEMO_MONTH = "2026-06";

/** 保存済みのみ（索引対象） */
export function storedDocuments(docs = MOCK_DOCUMENTS): DocumentRecord[] {
  return docs.filter((d) => d.status === "stored");
}

/** 指定月（YYYY-MM）の保存済み証憑 */
export function documentsInMonth(ym: string, docs = MOCK_DOCUMENTS): DocumentRecord[] {
  return storedDocuments(docs)
    .filter((d) => monthKey(d.transactionDate) === ym)
    .sort((a, b) => (a.transactionDate! < b.transactionDate! ? 1 : -1));
}

export function countByStatus(status: DocStatus, docs = MOCK_DOCUMENTS): number {
  return docs.filter((d) => d.status === status).length;
}

export function sumAmount(docs: DocumentRecord[]): number {
  return docs.reduce((acc, d) => acc + (d.amountInclTax ?? 0), 0);
}

/** 保存済み証憑が存在する月の一覧（新しい順）とサマリー */
export interface MonthSummary {
  ym: string;
  count: number;
  total: number;
}

export function monthSummaries(docs = MOCK_DOCUMENTS): MonthSummary[] {
  const map = new Map<string, DocumentRecord[]>();
  for (const d of storedDocuments(docs)) {
    const ym = monthKey(d.transactionDate);
    if (!ym) continue;
    const arr = map.get(ym) ?? [];
    arr.push(d);
    map.set(ym, arr);
  }
  return [...map.entries()]
    .map(([ym, arr]) => ({ ym, count: arr.length, total: sumAmount(arr) }))
    .sort((a, b) => (a.ym < b.ym ? 1 : -1));
}

export function reviewQueue(docs = MOCK_DOCUMENTS): DocumentRecord[] {
  return docs
    .filter((d) => d.status === "review")
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

/** 検索条件 */
export interface SearchFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  amountMin?: number;
  amountMax?: number;
  partner?: string;
  type?: DocType | "all";
  status?: DocStatus | "all";
}

export function filterDocuments(
  filters: SearchFilters,
  docs = MOCK_DOCUMENTS,
): DocumentRecord[] {
  return docs
    .filter((d) => {
      const { from, to, amountMin, amountMax, partner, type, status } = filters;
      if (from && (!d.transactionDate || d.transactionDate < from)) return false;
      if (to && (!d.transactionDate || d.transactionDate > to)) return false;
      if (amountMin != null && (d.amountInclTax ?? -1) < amountMin) return false;
      if (amountMax != null && (d.amountInclTax ?? Infinity) > amountMax) return false;
      if (partner && !(d.partnerName ?? "").includes(partner)) return false;
      if (type && type !== "all" && d.documentType !== type) return false;
      if (status && status !== "all" && d.status !== status) return false;
      return true;
    })
    .sort((a, b) => {
      const da = a.transactionDate ?? "";
      const db = b.transactionDate ?? "";
      return da < db ? 1 : da > db ? -1 : 0;
    });
}
