import type {
  DocType,
  ExtractionInput,
  ExtractionResult,
} from "@/lib/types";
import type { Extractor } from "./extractor";

/**
 * Gemini による証憑抽出（サーバー専用）。
 * 既定は Flash-Lite、低確信のみ上位 Flash に自動エスカレーション。
 * JSON Schema による構造化出力（仕様書 §5.3）。
 */
export class GeminiExtractor implements Extractor {
  readonly name = "gemini";

  private readonly apiKey: string;
  private readonly liteModel: string;
  private readonly proModel: string;

  constructor(opts: {
    apiKey: string;
    liteModel?: string;
    proModel?: string;
  }) {
    this.apiKey = opts.apiKey;
    this.liteModel = opts.liteModel ?? "gemini-2.5-flash-lite";
    this.proModel = opts.proModel ?? "gemini-2.5-flash";
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    // まず Flash-Lite。低確信なら上位 Flash で再抽出。
    const lite = await this.callModel(this.liteModel, input);
    if (!isLowConfidence(lite)) return lite;

    try {
      const pro = await this.callModel(this.proModel, input);
      // より確信度の高い方を採用
      return pro.overallConfidence >= lite.overallConfidence ? pro : lite;
    } catch {
      return lite;
    }
  }

  private async callModel(
    model: string,
    input: ExtractionInput,
  ): Promise<ExtractionResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const parts: unknown[] = [];
    // 原本（PDF/画像）をインラインで渡す。Geminiがネイティブに文書理解する。
    if (typeof input.data === "string" && input.data.length > 0) {
      parts.push({
        inline_data: { mime_type: input.mimeType, data: input.data },
      });
    }
    // テキストPDFのネイティブ抽出結果があれば補助として渡す。
    if (input.nativeText) {
      parts.push({ text: `参考テキスト:\n${input.nativeText}` });
    }
    parts.push({ text: USER_PROMPT });

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 300)}`);
    }

    const json = await res.json();
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API: 応答に本文がありません");
    }

    const parsed = JSON.parse(text) as GeminiPayload;
    return toResult(parsed, model);
  }
}

/** Geminiに返させるJSON構造 */
type GeminiPayload = {
  transactionDate: string;
  partnerName: string;
  amountInclTax: number;
  documentType: DocType;
  registrationNumber: string | null;
  confidence: {
    transactionDate: number;
    partnerName: number;
    amountInclTax: number;
    documentType: number;
    registrationNumber?: number;
  };
};

const DOC_TYPES: DocType[] = [
  "invoice",
  "receipt",
  "quote",
  "delivery",
  "other",
];

function toResult(p: GeminiPayload, model: string): ExtractionResult {
  const c = p.confidence ?? ({} as GeminiPayload["confidence"]);
  const documentType: DocType = DOC_TYPES.includes(p.documentType)
    ? p.documentType
    : "other";
  const required = [
    c.transactionDate ?? 0,
    c.partnerName ?? 0,
    c.amountInclTax ?? 0,
    c.documentType ?? 0,
  ];
  const overall = required.reduce((a, b) => a + b, 0) / required.length;

  return {
    transactionDate: {
      value: p.transactionDate,
      confidence: c.transactionDate ?? 0,
    },
    partnerName: { value: p.partnerName, confidence: c.partnerName ?? 0 },
    amountInclTax: { value: p.amountInclTax, confidence: c.amountInclTax ?? 0 },
    documentType: { value: documentType, confidence: c.documentType ?? 0 },
    registrationNumber: {
      value: p.registrationNumber ?? null,
      confidence: c.registrationNumber ?? 0,
    },
    overallConfidence: Number(overall.toFixed(3)),
    model,
    raw: p,
  };
}

function isLowConfidence(r: ExtractionResult): boolean {
  return [
    r.transactionDate.confidence,
    r.partnerName.confidence,
    r.amountInclTax.confidence,
    r.documentType.confidence,
  ].some((c) => c < 0.85);
}

const SYSTEM_PROMPT = `あなたは日本の会計・経理の実務に精通した証憑（請求書・領収書など）の項目抽出エンジンです。
アップロードされた証憑画像/PDFから、指定のJSONスキーマに厳密に従って項目を抽出します。
必ず日本語の商習慣・電子帳簿保存法の観点で正確に判断してください。`;

const USER_PROMPT = `次の証憑から以下を抽出し、JSONのみを返してください。

- transactionDate: 取引年月日。必ず "YYYY-MM-DD" 形式。請求書は請求日/締め日、領収書は受領日を優先。和暦は西暦へ変換。
- partnerName: 取引先名。法人格（株式会社・有限会社・合同会社等）を含む正式名称。自社ではなく相手先。
- amountInclTax: 税込の合計金額。円・整数のみ（カンマ・円記号・小数を含めない）。
- documentType: 書類の種類。invoice=請求書 / receipt=領収書 / quote=見積書 / delivery=納品書 / other=その他。
- registrationNumber: 適格請求書発行事業者の登録番号。"T"+13桁。無ければ null。
- confidence: 各項目の確信度(0.0〜1.0)。読み取りが曖昧・かすれ・手書き等は低く見積もる。

不明な必須項目は最善の推定値を入れ、confidenceを低くしてください。`;

/** 仕様書 §5.3 の構造化出力スキーマ（Gemini responseSchema形式） */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    transactionDate: { type: "string" },
    partnerName: { type: "string" },
    amountInclTax: { type: "integer" },
    documentType: {
      type: "string",
      enum: ["invoice", "receipt", "quote", "delivery", "other"],
    },
    registrationNumber: { type: "string", nullable: true },
    confidence: {
      type: "object",
      properties: {
        transactionDate: { type: "number" },
        partnerName: { type: "number" },
        amountInclTax: { type: "number" },
        documentType: { type: "number" },
        registrationNumber: { type: "number" },
      },
      required: [
        "transactionDate",
        "partnerName",
        "amountInclTax",
        "documentType",
      ],
    },
  },
  required: [
    "transactionDate",
    "partnerName",
    "amountInclTax",
    "documentType",
    "confidence",
  ],
};
