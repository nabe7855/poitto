// ドメイン型（仕様書 §3 / §5 準拠）

export type DocType = "invoice" | "receipt" | "quote" | "delivery" | "other";

export type DocStatus = "extracting" | "review" | "stored" | "error";

/** 抽出フィールド（値＋確信度） */
export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0..1
}

/** 抽出への入力（原本ファイル） */
export interface ExtractionInput {
  fileName: string;
  mimeType: string;
  data: ArrayBuffer | string; // バイナリ or base64（モックでは未使用）
  nativeText?: string; // テキストPDFのネイティブ抽出結果（あれば）
}

/** [COST-DEBUG] AI費用試算用のトークン使用量（★本番前に削除する一時機能★） */
export interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  estimatedCostJpy: number;
}

/** 抽出結果（Extractor の出力） */
export interface ExtractionResult {
  transactionDate: ExtractedField<string>; // "YYYY-MM-DD"
  partnerName: ExtractedField<string>;
  amountInclTax: ExtractedField<number>; // 円・整数（税込）
  documentType: ExtractedField<DocType>;
  registrationNumber: ExtractedField<string | null>; // "T"+13桁 or null
  overallConfidence: number;
  model: string;
  raw?: unknown;
  usage?: ExtractionUsage; // [COST-DEBUG] ★本番前に削除★
}

/** 証憑（アプリ内モデル。確定値＋抽出メタ＋保存情報） */
export interface DocumentRecord {
  id: string;
  status: DocStatus;
  // 確定値
  transactionDate: string | null; // "YYYY-MM-DD"
  partnerName: string | null;
  amountInclTax: number | null;
  documentType: DocType | null;
  registrationNumber: string | null;
  // 抽出メタ
  confidence: Partial<Record<FieldKey, number>>;
  overallConfidence: number;
  model: string;
  // 命名・保存
  fileName: string | null;
  storedPath: string | null;
  // 任意メモ（目的・相手・場所など。音声入力→AI整形で付与可）
  memo?: string | null;
  // 分類タグ（部門＝事業/プロジェクト、科目＝勘定科目）
  department?: string | null;
  account?: string | null;
  usage?: ExtractionUsage; // [COST-DEBUG] ★本番前に削除★
  // 原本
  mimeType: string;
  sizeBytes: number;
  // 監査
  uploadedAt: string; // ISO
  confirmedAt: string | null;
}

/** 必須／抽出対象フィールドのキー */
export type FieldKey =
  | "transactionDate"
  | "partnerName"
  | "amountInclTax"
  | "documentType"
  | "registrationNumber";

/** 必須項目（欠落・低確信で要確認へ） */
export const REQUIRED_FIELDS: FieldKey[] = [
  "transactionDate",
  "partnerName",
  "amountInclTax",
  "documentType",
];

/** 要確認しきい値（これ未満はハイライト＆確認キュー行き） */
export const REVIEW_THRESHOLD = 0.85;

export type AuditAction =
  | "create"
  | "extract"
  | "confirm"
  | "update"
  | "export"
  | "delete";

export interface AuditLog {
  id: string;
  documentId: string | null;
  action: AuditAction;
  actor: string;
  detail?: string;
  createdAt: string; // ISO
}
