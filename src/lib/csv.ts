import type { DocumentRecord } from "./types";
import { docTypeLabel } from "./format";
import { effectivePayment, METHOD_LABEL } from "./payments";

export type CsvOptions = {
  /** 支払い列（支払期日・支払状況・支払日・支払方法）を末尾に追加する */
  withPayment?: boolean;
};

// 既存の列の並びは変えず、末尾に足す（会計ソフトの取込設定を壊さないため）
const PAYMENT_HEADER = ["支払期日", "支払状況", "支払日", "支払方法"];

const PAYMENT_LABEL: Record<ReturnType<typeof effectivePayment>, string> = {
  unpaid: "未払い",
  paid: "支払済み",
  auto_paid: "支払済み（引落）",
  not_applicable: "対象外",
  unknown: "未確認",
};

function paymentCells(d: DocumentRecord): string[] {
  return [
    d.dueDate ?? "",
    PAYMENT_LABEL[effectivePayment(d)],
    d.paidAt ?? "",
    d.paymentMethod ? METHOD_LABEL[d.paymentMethod] : "",
  ];
}

const HEADER = [
  "取引年月日",
  "取引先",
  "税込金額",
  "種別",
  "登録番号",
  "部門",
  "科目",
  "ファイル名",
  "保存先",
  "メモ",
];

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

/** 証憑一覧をCSV文字列に（電帳法の索引用途） */
export function documentsToCsv(docs: DocumentRecord[], opts: CsvOptions = {}): string {
  const header = opts.withPayment ? [...HEADER, ...PAYMENT_HEADER] : HEADER;
  const rows = docs.map((d) => [
    d.transactionDate ?? "",
    d.partnerName ?? "",
    d.amountInclTax != null ? String(d.amountInclTax) : "",
    docTypeLabel(d.documentType),
    d.registrationNumber ?? "",
    d.department ?? "",
    d.account ?? "",
    d.fileName ?? "",
    d.storedPath ?? "",
    d.memo ?? "",
    ...(opts.withPayment ? paymentCells(d) : []),
  ]);
  return [header, ...rows]
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
  "部門",
  "勘定科目",
  "摘要",
  "ファイル名",
];

function slashDate(iso: string | null): string {
  return iso ? iso.replace(/-/g, "/") : "";
}

/** 会計ソフト取込用CSV（汎用フォーマット） */
export function documentsToAccountingCsv(
  docs: DocumentRecord[],
  opts: CsvOptions = {},
): string {
  const header = opts.withPayment
    ? [...ACCOUNTING_HEADER, ...PAYMENT_HEADER]
    : ACCOUNTING_HEADER;
  const rows = docs.map((d) => [
    slashDate(d.transactionDate),
    d.partnerName ?? "",
    d.amountInclTax != null ? String(d.amountInclTax) : "",
    docTypeLabel(d.documentType),
    d.registrationNumber ?? "",
    d.department ?? "",
    d.account ?? "",
    d.memo ?? "",
    d.fileName ?? "",
    ...(opts.withPayment ? paymentCells(d) : []),
  ]);
  return [header, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}
