import type {
  DocStatus,
  DocType,
  DocumentRecord,
  ExtractionResult,
  FieldKey,
} from "./types";
import { REQUIRED_FIELDS, REVIEW_THRESHOLD } from "./types";
import { buildFileName, monthKey, storedPathOf } from "./format";

/** 抽出結果のフィールド別確信度をまとめる */
export function confidenceMap(
  r: ExtractionResult,
): Partial<Record<FieldKey, number>> {
  return {
    transactionDate: r.transactionDate.confidence,
    partnerName: r.partnerName.confidence,
    amountInclTax: r.amountInclTax.confidence,
    documentType: r.documentType.confidence,
    registrationNumber: r.registrationNumber.confidence,
  };
}

/** 必須項目が欠落 or しきい値未満なら要確認 */
export function needsReview(r: ExtractionResult): boolean {
  const conf = confidenceMap(r);
  return REQUIRED_FIELDS.some((k) => {
    const c = conf[k];
    return c == null || c < REVIEW_THRESHOLD;
  });
}

/** 抽出結果を証憑レコードに反映（命名・保存先の確定を含む） */
export function applyExtraction(
  base: DocumentRecord,
  r: ExtractionResult,
): DocumentRecord {
  const status: DocStatus = needsReview(r) ? "review" : "stored";
  const fields = {
    transactionDate: r.transactionDate.value,
    partnerName: r.partnerName.value,
    amountInclTax: r.amountInclTax.value,
    documentType: r.documentType.value,
    mimeType: base.mimeType,
  };
  const ym = monthKey(r.transactionDate.value);
  const stored = status === "stored";

  return {
    ...base,
    status,
    transactionDate: r.transactionDate.value,
    partnerName: r.partnerName.value,
    amountInclTax: r.amountInclTax.value,
    documentType: r.documentType.value,
    registrationNumber: r.registrationNumber.value,
    confidence: confidenceMap(r),
    overallConfidence: r.overallConfidence,
    model: r.model,
    fileName: stored ? buildFileName(fields) : null,
    storedPath: stored && ym ? storedPathOf(ym) : null,
    confirmedAt: null,
  };
}

/** 確認キューでの確定（人手修正を反映して保存済みへ） */
export function confirmDraft(
  base: DocumentRecord,
  draft: {
    transactionDate: string;
    partnerName: string;
    amountInclTax: number;
    documentType: DocType;
    registrationNumber: string | null;
  },
  at: string,
): DocumentRecord {
  const ym = monthKey(draft.transactionDate);
  return {
    ...base,
    status: "stored",
    transactionDate: draft.transactionDate,
    partnerName: draft.partnerName,
    amountInclTax: draft.amountInclTax,
    documentType: draft.documentType,
    registrationNumber: draft.registrationNumber,
    fileName: buildFileName({ ...draft, mimeType: base.mimeType }),
    storedPath: ym ? storedPathOf(ym) : null,
    confirmedAt: at,
  };
}
