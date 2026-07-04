import type { AuditLog, DocumentRecord } from "./types";
import { buildFileName, monthKey, storedPathOf } from "./format";

type Seed = {
  id: string;
  status: DocumentRecord["status"];
  transactionDate: string | null;
  partnerName: string | null;
  amountInclTax: number | null;
  documentType: DocumentRecord["documentType"];
  registrationNumber: string | null;
  confidence: DocumentRecord["confidence"];
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: string;
};

const SEEDS: Seed[] = [
  // 受入基準のサンプル（佐川急便）
  {
    id: "doc_sagawa_0630",
    status: "stored",
    transactionDate: "2026-06-30",
    partnerName: "佐川急便株式会社",
    amountInclTax: 71610,
    documentType: "invoice",
    registrationNumber: "T8130001000053",
    confidence: {
      transactionDate: 0.99,
      partnerName: 0.98,
      amountInclTax: 0.97,
      documentType: 0.99,
      registrationNumber: 0.96,
    },
    sizeBytes: 214_500,
    uploadedAt: "2026-07-02T09:12:00+09:00",
  },
  {
    id: "doc_amazon_0628",
    status: "stored",
    transactionDate: "2026-06-28",
    partnerName: "アマゾンジャパン合同会社",
    amountInclTax: 3980,
    documentType: "receipt",
    registrationNumber: "T5010401067252",
    confidence: {
      transactionDate: 0.98,
      partnerName: 0.95,
      amountInclTax: 0.99,
      documentType: 0.94,
      registrationNumber: 0.92,
    },
    sizeBytes: 88_200,
    uploadedAt: "2026-06-28T18:40:00+09:00",
  },
  {
    id: "doc_docomo_0625",
    status: "stored",
    transactionDate: "2026-06-25",
    partnerName: "株式会社NTTドコモ",
    amountInclTax: 8250,
    documentType: "invoice",
    registrationNumber: "T7010001067884",
    confidence: {
      transactionDate: 0.97,
      partnerName: 0.96,
      amountInclTax: 0.98,
      documentType: 0.97,
      registrationNumber: 0.9,
    },
    sizeBytes: 132_800,
    uploadedAt: "2026-06-25T11:05:00+09:00",
  },
  {
    id: "doc_askul_0620",
    status: "stored",
    transactionDate: "2026-06-20",
    partnerName: "アスクル株式会社",
    amountInclTax: 15400,
    documentType: "invoice",
    registrationNumber: "T4010401039006",
    confidence: {
      transactionDate: 0.96,
      partnerName: 0.97,
      amountInclTax: 0.95,
      documentType: 0.96,
      registrationNumber: 0.93,
    },
    sizeBytes: 156_300,
    uploadedAt: "2026-06-20T14:22:00+09:00",
  },
  {
    id: "doc_seven_0615",
    status: "stored",
    transactionDate: "2026-06-15",
    partnerName: "株式会社セブン-イレブン・ジャパン",
    amountInclTax: 1280,
    documentType: "receipt",
    registrationNumber: null,
    confidence: {
      transactionDate: 0.99,
      partnerName: 0.9,
      amountInclTax: 0.99,
      documentType: 0.98,
    },
    sizeBytes: 64_100,
    uploadedAt: "2026-06-15T20:10:00+09:00",
  },
  {
    id: "doc_kuroneko_0612",
    status: "stored",
    transactionDate: "2026-06-12",
    partnerName: "ヤマト運輸株式会社",
    amountInclTax: 4620,
    documentType: "invoice",
    registrationNumber: "T4010001008846",
    confidence: {
      transactionDate: 0.97,
      partnerName: 0.98,
      amountInclTax: 0.96,
      documentType: 0.97,
      registrationNumber: 0.94,
    },
    sizeBytes: 98_700,
    uploadedAt: "2026-06-12T10:33:00+09:00",
  },
  // 要確認（低確信あり）
  {
    id: "doc_review_kanban_0629",
    status: "review",
    transactionDate: "2026-06-29",
    partnerName: "有限会社かんばん堂",
    amountInclTax: 33000,
    documentType: "invoice",
    registrationNumber: null,
    confidence: {
      transactionDate: 0.72, // 低確信（日付が手書き）
      partnerName: 0.88,
      amountInclTax: 0.91,
      documentType: 0.86,
      registrationNumber: 0.4,
    },
    sizeBytes: 176_400,
    uploadedAt: "2026-07-03T08:50:00+09:00",
  },
  {
    id: "doc_review_cafe_0626",
    status: "review",
    transactionDate: "2026-06-26",
    partnerName: "カフェ・ド・みどり",
    amountInclTax: 2860,
    documentType: "receipt",
    registrationNumber: null,
    confidence: {
      transactionDate: 0.93,
      partnerName: 0.61, // 低確信（かすれ）
      amountInclTax: 0.79, // 低確信
      documentType: 0.9,
    },
    sizeBytes: 52_900,
    uploadedAt: "2026-07-03T08:51:00+09:00",
  },
  // 抽出中
  {
    id: "doc_extracting_now",
    status: "extracting",
    transactionDate: null,
    partnerName: null,
    amountInclTax: null,
    documentType: null,
    registrationNumber: null,
    confidence: {},
    sizeBytes: 203_100,
    uploadedAt: "2026-07-04T09:40:00+09:00",
  },
  // 先月（2026-05）
  {
    id: "doc_rakuten_0528",
    status: "stored",
    transactionDate: "2026-05-28",
    partnerName: "楽天グループ株式会社",
    amountInclTax: 9800,
    documentType: "invoice",
    registrationNumber: "T2010701007171",
    confidence: {
      transactionDate: 0.98,
      partnerName: 0.96,
      amountInclTax: 0.97,
      documentType: 0.96,
      registrationNumber: 0.93,
    },
    sizeBytes: 121_000,
    uploadedAt: "2026-05-28T13:00:00+09:00",
  },
  {
    id: "doc_kepco_0515",
    status: "stored",
    transactionDate: "2026-05-15",
    partnerName: "東京電力エナジーパートナー株式会社",
    amountInclTax: 12430,
    documentType: "invoice",
    registrationNumber: "T3010001077517",
    confidence: {
      transactionDate: 0.97,
      partnerName: 0.95,
      amountInclTax: 0.98,
      documentType: 0.97,
      registrationNumber: 0.92,
    },
    sizeBytes: 143_200,
    uploadedAt: "2026-05-15T09:20:00+09:00",
  },
  {
    id: "doc_daiso_0508",
    status: "stored",
    transactionDate: "2026-05-08",
    partnerName: "株式会社大創産業",
    amountInclTax: 550,
    documentType: "receipt",
    registrationNumber: null,
    confidence: {
      transactionDate: 0.99,
      partnerName: 0.9,
      amountInclTax: 0.99,
      documentType: 0.98,
    },
    sizeBytes: 41_800,
    uploadedAt: "2026-05-08T16:45:00+09:00",
  },
];

function toRecord(s: Seed): DocumentRecord {
  const mimeType = s.mimeType ?? "application/pdf";
  const ym = monthKey(s.transactionDate);
  const confidences = Object.values(s.confidence);
  const overall =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;
  const base = {
    transactionDate: s.transactionDate,
    partnerName: s.partnerName,
    amountInclTax: s.amountInclTax,
    documentType: s.documentType,
    mimeType,
  };
  const isStored = s.status === "stored";
  return {
    id: s.id,
    status: s.status,
    transactionDate: s.transactionDate,
    partnerName: s.partnerName,
    amountInclTax: s.amountInclTax,
    documentType: s.documentType,
    registrationNumber: s.registrationNumber,
    confidence: s.confidence,
    overallConfidence: Number(overall.toFixed(3)),
    model: "mock-extractor",
    fileName: isStored ? buildFileName(base) : null,
    storedPath: isStored && ym ? storedPathOf(ym) : null,
    mimeType,
    sizeBytes: s.sizeBytes ?? 120_000,
    uploadedAt: s.uploadedAt,
    confirmedAt: isStored ? s.uploadedAt : null,
  };
}

/** モックの証憑一覧（フェーズ3以降で実データに差し替え） */
export const MOCK_DOCUMENTS: DocumentRecord[] = SEEDS.map(toRecord);

export function getDocument(id: string): DocumentRecord | undefined {
  return MOCK_DOCUMENTS.find((d) => d.id === id);
}

/** モックの監査ログ */
export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log_1",
    documentId: "doc_sagawa_0630",
    action: "create",
    actor: "山田 太郎",
    detail: "投函（PDF）",
    createdAt: "2026-07-02T09:12:00+09:00",
  },
  {
    id: "log_2",
    documentId: "doc_sagawa_0630",
    action: "extract",
    actor: "system",
    detail: "抽出完了（確信度 97%）",
    createdAt: "2026-07-02T09:12:20+09:00",
  },
  {
    id: "log_3",
    documentId: "doc_sagawa_0630",
    action: "confirm",
    actor: "山田 太郎",
    detail: "保存済みへ確定",
    createdAt: "2026-07-02T09:14:00+09:00",
  },
];
