import type {
  AuditAction,
  AuditLog,
  DocStatus,
  DocType,
  DocumentRecord,
  FieldKey,
} from "@/lib/types";
import type { ApiRow } from "./client";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** API（DBの列名）→ アプリのDocumentRecordへ変換 */
export function mapApiDoc(row: ApiRow): DocumentRecord {
  let confidence: Partial<Record<FieldKey, number>> = {};
  const rawExtraction = row.extraction;
  if (rawExtraction) {
    try {
      const ex =
        typeof rawExtraction === "string"
          ? JSON.parse(rawExtraction)
          : (rawExtraction as { confidence?: Partial<Record<FieldKey, number>> });
      confidence = ex.confidence ?? {};
    } catch {
      /* 壊れたJSONは無視 */
    }
  }

  return {
    id: String(row.id),
    status: (row.status as DocStatus) ?? "stored",
    transactionDate: (row.transaction_date as string) ?? null,
    partnerName: (row.partner_name as string) ?? null,
    amountInclTax: num(row.amount_incl_tax),
    documentType: (row.document_type as DocType) ?? null,
    registrationNumber: (row.registration_number as string) ?? null,
    confidence,
    overallConfidence: num(row.overall_confidence) ?? 0,
    model: (row.model as string) ?? "",
    fileName: (row.file_name as string) ?? null,
    storedPath: (row.stored_path as string) ?? null,
    memo: (row.memo as string) ?? null,
    mimeType: (row.mime_type as string) ?? "application/pdf",
    sizeBytes: num(row.size_bytes) ?? 0,
    uploadedAt: (row.uploaded_at as string) ?? "",
    confirmedAt: null,
  };
}

/** API（audit_logs）→ AuditLogへ変換 */
export function mapApiAudit(row: ApiRow): AuditLog {
  let detail = "";
  const raw = row.detail;
  if (raw) {
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      detail = (obj as { message?: string })?.message ?? "";
    } catch {
      detail = String(raw);
    }
  }
  return {
    id: String(row.id),
    documentId: (row.document_id as string) ?? null,
    action: (row.action as AuditAction) ?? "update",
    actor: (row.partner_name as string) ?? "",
    detail,
    createdAt: (row.created_at as string) ?? "",
  };
}
