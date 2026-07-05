import type { DocumentRecord } from "./types";
import { docTypeLabel } from "./format";

const HEADER = [
  "取引年月日",
  "取引先",
  "税込金額",
  "種別",
  "登録番号",
  "ファイル名",
  "保存先",
  "メモ",
];

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** 証憑一覧をCSV文字列に（電帳法の索引用途） */
export function documentsToCsv(docs: DocumentRecord[]): string {
  const rows = docs.map((d) => [
    d.transactionDate ?? "",
    d.partnerName ?? "",
    d.amountInclTax != null ? String(d.amountInclTax) : "",
    docTypeLabel(d.documentType),
    d.registrationNumber ?? "",
    d.fileName ?? "",
    d.storedPath ?? "",
    d.memo ?? "",
  ]);
  return [HEADER, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}

/** Excel向けにBOMを付けたCSV（文字コード対策） */
export function csvWithBom(csv: string): string {
  return "﻿" + csv;
}

// 会計ソフト取込用（汎用）。多くのソフトでマッピングしやすい列・日付はYYYY/MM/DD。
const ACCOUNTING_HEADER = [
  "取引日",
  "取引先",
  "税込金額",
  "書類の種類",
  "登録番号",
  "摘要",
  "ファイル名",
];

function slashDate(iso: string | null): string {
  return iso ? iso.replace(/-/g, "/") : "";
}

/** 会計ソフト取込用CSV（汎用フォーマット） */
export function documentsToAccountingCsv(docs: DocumentRecord[]): string {
  const rows = docs.map((d) => [
    slashDate(d.transactionDate),
    d.partnerName ?? "",
    d.amountInclTax != null ? String(d.amountInclTax) : "",
    docTypeLabel(d.documentType),
    d.registrationNumber ?? "",
    d.memo ?? "",
    d.fileName ?? "",
  ]);
  return [ACCOUNTING_HEADER, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}
