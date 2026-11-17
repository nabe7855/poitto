import type { DocStatus, DocType, DocumentRecord } from "./types";
import { MOCK_DOCUMENTS } from "./mock-data";
import { monthKey } from "./format";
import { bucketOf, effectivePayment, isPayable } from "./payments";

/** デモの基準月（受入基準が2026年6月のため） */
export const DEMO_MONTH = "2026-06";

/** 今月（YYYY-MM） */
export function currentYm(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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
  department?: string; // 部分一致
  account?: string; // "all" もしくは科目名（完全一致）
  /** 支払状況（請求書が対象） */
  payment?: PaymentFilter;
}

export type PaymentFilter = "all" | "unpaid" | "overdue" | "paid" | "unknown";

function matchesPayment(d: DocumentRecord, f: PaymentFilter): boolean {
  if (f === "all") return true;
  if (!isPayable(d)) return false;
  const eff = effectivePayment(d);
  if (f === "unpaid") return eff === "unpaid";
  if (f === "overdue") return bucketOf(d) === "overdue";
  if (f === "paid") return eff === "paid" || eff === "auto_paid";
  return eff === "unknown";
}

export function filterDocuments(
  filters: SearchFilters,
  docs = MOCK_DOCUMENTS,
): DocumentRecord[] {
  return docs
    .filter((d) => {
      const { from, to, amountMin, amountMax, partner, type, status, department, account } =
        filters;
      if (from && (!d.transactionDate || d.transactionDate < from)) return false;
      if (to && (!d.transactionDate || d.transactionDate > to)) return false;
      if (amountMin != null && (d.amountInclTax ?? -1) < amountMin) return false;
      if (amountMax != null && (d.amountInclTax ?? Infinity) > amountMax) return false;
      if (partner && !(d.partnerName ?? "").includes(partner)) return false;
      if (type && type !== "all" && d.documentType !== type) return false;
      if (status && status !== "all" && d.status !== status) return false;
      if (department && !(d.department ?? "").includes(department)) return false;
      if (account && account !== "all" && d.account !== account) return false;
      if (filters.payment && !matchesPayment(d, filters.payment)) return false;
      return true;
    })
    .sort((a, b) => {
      const da = a.transactionDate ?? "";
      const db = b.transactionDate ?? "";
      return da < db ? 1 : da > db ? -1 : 0;
    });
}
