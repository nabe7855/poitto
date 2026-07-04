"use strict";
// 抽出ワーカー（S3→SQS起動）。原本をGeminiで抽出し、命名・保存 or 要確認へ振り分けてDB更新。
// APIキーはSecrets Managerから取得（コードに書かない）。

const { withTenant } = require("../shared/db");
const { getBytes } = require("../shared/storage");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const REVIEW_THRESHOLD = 0.85;
const sm = new SecretsManagerClient({});
let cachedKey = null;

async function geminiApiKey() {
  if (cachedKey) return cachedKey;
  const res = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.GEMINI_SECRET_ARN }),
  );
  const raw = res.SecretString || "";
  try {
    const obj = JSON.parse(raw);
    cachedKey = obj.apiKey || obj.GEMINI_API_KEY || raw;
  } catch {
    cachedKey = raw;
  }
  return cachedKey;
}

/** S3キー originals/{tenantId}/... からテナントIDを取り出す */
function tenantFromKey(key) {
  const parts = key.split("/");
  return parts[0] === "originals" ? parts[1] : null;
}

exports.handler = async (event) => {
  for (const record of event.Records || []) {
    const body = JSON.parse(record.body);
    // S3通知（直接 or SNS経由）に対応
    const s3records = body.Records || [];
    for (const r of s3records) {
      const key = decodeURIComponent(
        (r.s3?.object?.key || "").replace(/\+/g, " "),
      );
      const tenantId = tenantFromKey(key);
      if (!tenantId || !key) continue;
      await processOne(tenantId, key);
    }
  }
  return { ok: true };
};

async function processOne(tenantId, key) {
  const bytes = await getBytes(key);
  const mimeType = key.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
  let extraction;
  try {
    extraction = await callGemini(bytes.toString("base64"), mimeType);
  } catch (err) {
    await update(tenantId, key, { status: "error" }, `抽出失敗: ${err.message}`);
    return;
  }

  const conf = extraction.confidence || {};
  const low = ["transactionDate", "partnerName", "amountInclTax", "documentType"].some(
    (k) => (conf[k] ?? 0) < REVIEW_THRESHOLD,
  );
  const status = low ? "review" : "stored";
  const fields = {
    status,
    transaction_date: extraction.transactionDate,
    partner_name: extraction.partnerName,
    amount_incl_tax: Number(extraction.amountInclTax),
    document_type: extraction.documentType,
    registration_number: extraction.registrationNumber || null,
  };
  await update(tenantId, key, fields, `抽出完了 → ${status}`, extraction);
}

async function update(tenantId, key, fields, detail, extraction) {
  await withTenant(tenantId, async (exec) => {
    const sets = ["status = :status"];
    const params = { key, status: fields.status, tid: tenantId };
    for (const col of [
      "transaction_date",
      "partner_name",
      "amount_incl_tax",
      "document_type",
      "registration_number",
    ]) {
      if (fields[col] !== undefined) {
        sets.push(`${col} = :${col}`);
        params[col] = fields[col];
      }
    }
    if (extraction) {
      sets.push("extraction = :ex::jsonb");
      params.ex = JSON.stringify(extraction);
    }
    await exec(
      `update documents set ${sets.join(", ")}
         where tenant_id = :tid and original_s3_key = :key`,
      params,
    );
    await exec(
      `insert into audit_logs (tenant_id, action, detail)
         values (:tid, 'extract', :detail)`,
      { tid: tenantId, detail: JSON.stringify({ message: detail }) },
    );
  });
}

const SCHEMA = {
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
      required: ["transactionDate", "partnerName", "amountInclTax", "documentType"],
    },
  },
  required: ["transactionDate", "partnerName", "amountInclTax", "documentType", "confidence"],
};

const PROMPT = `この証憑から取引年月日(YYYY-MM-DD)、取引先名(法人格込み)、税込金額(整数)、書類種別(invoice/receipt/quote/delivery/other)、登録番号(T+13桁 or null)を抽出し、各項目のconfidence(0-1)を付けてJSONで返してください。`;

async function callGemini(base64, mimeType) {
  const key = await geminiApiKey();
  const model = process.env.GEMINI_MODEL_LITE || "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty response");
  return JSON.parse(text);
}
