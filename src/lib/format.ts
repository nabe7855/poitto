import type { DocType, DocumentRecord } from "./types";

/** 書類種別の日本語表示名 */
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  invoice: "請求書",
  receipt: "領収書",
  quote: "見積書",
  delivery: "納品書",
  other: "その他",
};

export function docTypeLabel(t: DocType | null): string {
  return t ? DOC_TYPE_LABEL[t] : "—";
}

/** 金額を「71,610円」形式に */
export function formatYen(n: number | null): string {
  if (n == null) return "—";
  return `${n.toLocaleString("ja-JP")}円`;
}

/** 金額を桁区切りのみ（円なし） */
export function formatAmount(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("ja-JP");
}

/** "YYYY-MM-DD" → "2026年6月30日" */
export function formatDateJp(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}

/** "YYYY-MM-DD" → "YYMMDD"（命名用） */
export function toYymmdd(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y.slice(2)}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
}

/** 月キー "YYYY-MM" を取り出す */
export function monthKey(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 7);
}

/** "YYYY-MM" → "2026年06月" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${m}月`;
}

/** "YYYY-MM" → 保存パス "保存済み/2026年06月/" */
export function storedPathOf(ym: string): string {
  return `保存済み/${monthLabel(ym)}/`;
}

const FILENAME_NG = /[\\/:*?"<>|]/g;

/** 命名規則：取引年月日_取引先名_税込金額_書類種別.拡張子 */
export function buildFileName(doc: {
  transactionDate: string | null;
  partnerName: string | null;
  amountInclTax: number | null;
  documentType: DocType | null;
  mimeType: string;
}): string | null {
  const { transactionDate, partnerName, amountInclTax, documentType } = doc;
  if (!transactionDate || !partnerName || amountInclTax == null || !documentType) {
    return null;
  }
  const ext = extFromMime(doc.mimeType);
  const safePartner = partnerName.replace(FILENAME_NG, "");
  return `${toYymmdd(transactionDate)}_${safePartner}_${amountInclTax}_${DOC_TYPE_LABEL[documentType]}.${ext}`;
}

function extFromMime(mime: string): string {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "pdf";
}

/** バイト数を人が読める形に */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** 確信度を % 表記に */
export function formatConfidence(c: number | undefined): string {
  if (c == null) return "—";
  return `${Math.round(c * 100)}%`;
}

/** 一覧向けの表示名（ファイル名が無ければ仮表示） */
export function displayName(doc: DocumentRecord): string {
  return doc.fileName ?? `${doc.partnerName ?? "（抽出中）"}`;
}
