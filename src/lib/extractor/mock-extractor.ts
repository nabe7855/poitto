import type { DocType, ExtractionInput, ExtractionResult } from "@/lib/types";
import { estimateCostJpy } from "@/lib/ai-cost"; // [COST-DEBUG] ★本番前に削除★
import type { Extractor } from "./extractor";

// [COST-DEBUG] モックでも代表的なトークン量で費用感を出す（★本番前に削除★）
function mockUsage(): ExtractionResult["usage"] {
  const inputTokens = 1800; // PDF1枚の目安
  const outputTokens = 60;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    model: "mock-extractor",
    estimatedCostJpy: estimateCostJpy("mock-extractor", inputTokens, outputTokens),
  };
}

/** 既知の取引先プロファイル（ファイル名/テキストのキーワードで判定） */
type Profile = {
  keywords: string[];
  partnerName: string;
  documentType: DocType;
  registrationNumber: string | null;
  amountInclTax: number;
  /** この取引先は高確信で自動保存されるか（false は要確認に寄せる） */
  confident: boolean;
};

const PROFILES: Profile[] = [
  {
    keywords: ["佐川", "sagawa"],
    partnerName: "佐川急便株式会社",
    documentType: "invoice",
    registrationNumber: "T8130001000053",
    amountInclTax: 71610,
    confident: true,
  },
  {
    keywords: ["amazon", "アマゾン"],
    partnerName: "アマゾンジャパン合同会社",
    documentType: "receipt",
    registrationNumber: "T5010401067252",
    amountInclTax: 3980,
    confident: true,
  },
  {
    keywords: ["docomo", "ドコモ", "ntt"],
    partnerName: "株式会社NTTドコモ",
    documentType: "invoice",
    registrationNumber: "T7010001067884",
    amountInclTax: 8250,
    confident: true,
  },
  {
    keywords: ["yamato", "ヤマト", "kuroneko"],
    partnerName: "ヤマト運輸株式会社",
    documentType: "invoice",
    registrationNumber: "T4010001008846",
    amountInclTax: 4620,
    confident: true,
  },
];

/** 未知ファイル向けのダミー候補（要確認に寄せる） */
const UNKNOWN_PARTNERS = [
  "有限会社かんばん堂",
  "カフェ・ド・みどり",
  "株式会社サンプル商会",
  "みらい文具店",
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * モック抽出器。
 * - ファイル名/ネイティブテキストに既知キーワードがあれば、その正解値を高確信で返す（受入基準の佐川に対応）。
 * - 未知の場合はハッシュから疑似的な値を生成し、一部項目を低確信にして「要確認」に振り分ける。
 * 実PDF/画像の解析はフェーズ4の GeminiExtractor が担う。
 */
export class MockExtractor implements Extractor {
  readonly name = "mock-extractor";

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    // 擬似的な処理待ち
    await new Promise((r) => setTimeout(r, 800));

    const haystack = `${input.fileName} ${input.nativeText ?? ""}`.toLowerCase();
    const profile = PROFILES.find((p) =>
      p.keywords.some((k) => haystack.includes(k.toLowerCase())),
    );

    if (profile) {
      return this.knownResult(profile);
    }
    return this.unknownResult(input.fileName);
  }

  private knownResult(p: Profile): ExtractionResult {
    const c = 0.95 + (p.amountInclTax % 4) * 0.01; // 0.95〜0.98
    return {
      transactionDate: { value: "2026-06-30", confidence: c },
      partnerName: { value: p.partnerName, confidence: c },
      amountInclTax: { value: p.amountInclTax, confidence: c },
      documentType: { value: p.documentType, confidence: c },
      registrationNumber: {
        value: p.registrationNumber,
        confidence: p.registrationNumber ? c - 0.03 : 0,
      },
      overallConfidence: c,
      model: this.name,
      raw: { source: "profile", partner: p.partnerName },
      usage: mockUsage(), // [COST-DEBUG] ★本番前に削除★
    };
  }

  private unknownResult(fileName: string): ExtractionResult {
    const h = hash(fileName);
    const partner = UNKNOWN_PARTNERS[h % UNKNOWN_PARTNERS.length];
    const day = (h % 27) + 1;
    const amount = 1000 + (h % 90) * 100 + (h % 10) * 10;
    const type: DocType = h % 2 === 0 ? "invoice" : "receipt";

    // 未知ファイルは一部項目を低確信にして要確認へ
    const lowDate = h % 3 === 0;
    const lowPartner = h % 3 === 1;
    const lowAmount = h % 3 === 2;

    const conf = (low: boolean) => (low ? 0.55 + (h % 20) / 100 : 0.9);

    return {
      transactionDate: {
        value: `2026-06-${pad2(day)}`,
        confidence: conf(lowDate),
      },
      partnerName: { value: partner, confidence: conf(lowPartner) },
      amountInclTax: { value: amount, confidence: conf(lowAmount) },
      documentType: { value: type, confidence: 0.88 },
      registrationNumber: { value: null, confidence: 0 },
      overallConfidence: 0.7,
      model: this.name,
      raw: { source: "generated", fileName },
      usage: mockUsage(), // [COST-DEBUG] ★本番前に削除★
    };
  }
}
