"use strict";
// 抽出ワーカー（S3→SQS起動）。原本をGeminiで抽出し、命名・保存 or 要確認へ振り分けてDB更新。
// APIキーはSecrets Managerから取得（コードに書かない）。

const { withTenant, execOne } = require("../shared/db");
const { getBytes } = require("../shared/storage");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const REVIEW_THRESHOLD = 0.85;
const sm = new SecretsManagerClient({});
let cachedKey = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** 自団体（受取側）の名称を取得。宛先を取引先に誤選択させないためAIへ渡す。 */
const orgNameCache = new Map();
async function tenantOrgName(tenantId) {
  if (orgNameCache.has(tenantId)) return orgNameCache.get(tenantId);
  let name = null;
  try {
    const rows = await execOne(
      `select name from tenants where id = :tid::uuid`,
      { tid: tenantId },
    );
    name = rows?.[0]?.name || null;
  } catch {
    name = null;
  }
  orgNameCache.set(tenantId, name);
  return name;
}

/** 比較用の正規化（空白・法人格・記号を除去）。 */
function normalizeName(s) {
  return (s || "")
    .replace(/[\s　]/g, "")
    .replace(
      /(特定非営利活動法人|一般社団法人|一般財団法人|公益社団法人|公益財団法人|社会福祉法人|株式会社|有限会社|合同会社|ＮＰＯ法人|NPO法人|御中|様)/gi,
      "",
    )
    .toLowerCase();
}

// SQSのmaxReceiveCountと合わせる（この回数までは再試行、超えたらエラー確定）
const MAX_RECEIVE = 3;

exports.handler = async (event) => {
  for (const record of event.Records || []) {
    // このメッセージが何回目の配信か（一時障害の再試行判定に使う）
    const receiveCount = Number(
      record.attributes?.ApproximateReceiveCount || 1,
    );
    const body = JSON.parse(record.body);
    // S3通知（直接 or SNS経由）に対応
    const s3records = body.Records || [];
    for (const r of s3records) {
      const key = decodeURIComponent(
        (r.s3?.object?.key || "").replace(/\+/g, " "),
      );
      const tenantId = tenantFromKey(key);
      if (!tenantId || !key) continue;
      await processOne(tenantId, key, receiveCount);
    }
  }
  return { ok: true };
};

async function processOne(tenantId, key, receiveCount = 1) {
  const bytes = await getBytes(key);
  const mimeType = key.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
  const orgName = await tenantOrgName(tenantId);
  let extraction;
  try {
    extraction = await callGemini(bytes.toString("base64"), mimeType, orgName);
  } catch (err) {
    // 一時障害（Gemini 503/429）は、まだ再試行の余地があればSQSへ戻して数分後に再挑戦。
    // 例外を投げるとメッセージはキューに戻り、可視性タイムアウト後に再配信される。
    if (err.retryable && receiveCount < MAX_RECEIVE) {
      console.error(
        `[extract-retry] key=${key} receive=${receiveCount} error=${err.message}`,
      );
      throw err;
    }
    // どのファイルで・何が起きたかをCloudWatchに残す（診断用）
    console.error(`[extract-fail] key=${key} error=${err.message}`);
    await update(tenantId, key, { status: "error" }, `抽出失敗: ${err.message}`);
    return;
  }

  const conf = extraction.confidence || {};
  // 保険: 取引先に自団体（宛先）を選んでいたら、ほぼ誤りなので要確認へ回す。
  if (
    orgName &&
    extraction.partnerName &&
    normalizeName(extraction.partnerName) === normalizeName(orgName)
  ) {
    conf.partnerName = 0.2;
    extraction.confidence = conf;
  }
  const low = ["transactionDate", "partnerName", "amountInclTax", "documentType"].some(
    (k) => (conf[k] ?? 0) < REVIEW_THRESHOLD,
  );
  const status = low ? "review" : "stored";
  const amount = Number(extraction.amountInclTax);
  const fields = {
    status,
    transaction_date: extraction.transactionDate,
    partner_name: extraction.partnerName,
    amount_incl_tax: amount,
    document_type: extraction.documentType,
    registration_number: extraction.registrationNumber || null,
  };
  // 保存済みは命名規則でファイル名・保存先を確定
  if (status === "stored") {
    fields.file_name = buildFileName(
      extraction.transactionDate,
      extraction.partnerName,
      amount,
      extraction.documentType,
      mimeType,
    );
    fields.stored_path = storedPathOf(extraction.transactionDate);
  }
  await update(tenantId, key, fields, `抽出完了 → ${status}`, extraction);
}

// 命名規則: 取引年月日_取引先名_税込金額_書類の種類.拡張子
const DOC_TYPE_LABEL = {
  invoice: "請求書",
  receipt: "領収書",
  quote: "見積書",
  delivery: "納品書",
  other: "その他",
};
const FILENAME_NG = /[\\/:*?"<>|]/g;
function extFromMime(mime) {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "pdf";
}
function buildFileName(date, partner, amount, type, mime) {
  if (!date || !partner || amount == null || !type) return null;
  const [y, m, d] = date.split("-");
  const yymmdd = `${y.slice(2)}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
  const safe = String(partner).replace(FILENAME_NG, "");
  return `${yymmdd}_${safe}_${amount}_${DOC_TYPE_LABEL[type] || "その他"}.${extFromMime(mime)}`;
}
function storedPathOf(date) {
  const [y, m] = date.split("-");
  return `保存済み/${y}年${m.padStart(2, "0")}月/`;
}

async function update(tenantId, key, fields, detail, extraction) {
  await withTenant(tenantId, async (exec) => {
    // 列ごとの型キャスト（Data APIは文字列で渡すため date 等は明示キャストが必要）
    const CAST = { transaction_date: "::date" };
    const sets = ["status = :status"];
    const params = { key, status: fields.status, tid: tenantId };
    for (const col of [
      "transaction_date",
      "partner_name",
      "amount_incl_tax",
      "document_type",
      "registration_number",
      "file_name",
      "stored_path",
    ]) {
      if (fields[col] !== undefined) {
        sets.push(`${col} = :${col}${CAST[col] || ""}`);
        params[col] = fields[col];
      }
    }
    if (extraction) {
      sets.push("extraction = :ex::jsonb");
      params.ex = JSON.stringify(extraction);
    }
    await exec(
      `update documents set ${sets.join(", ")}
         where tenant_id = :tid::uuid and original_s3_key = :key`,
      params,
    );
    await exec(
      `insert into audit_logs (tenant_id, action, detail)
         values (:tid::uuid, 'extract', :detail::jsonb)`,
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

const PROMPT = `あなたは日本の経理実務に精通した証憑の項目抽出エンジンです。次の証憑から項目を抽出し、各項目のconfidence(0-1)を付けてJSONのみで返してください。

- transactionDate: 取引年月日。"YYYY-MM-DD"。請求書は請求日/締切日、領収書は受領日。和暦は西暦へ。
- partnerName: 取引先名＝「この証憑を発行した側＝あなたに請求/納品/領収した相手」。
  ★最重要★ 発行者は【法人とは限らず、個人名の場合も多い】。請求書の「個人名」欄・差出人・署名・振込口座名義に書かれた氏名がそのまま取引先になる。
  請求書なら発行元（請求元）、領収書なら発行店。会社印・登録番号・振込口座名義の近くにある名義が該当。
  「〇〇 御中/様」と書かれた宛先（＝受取側＝この証憑を受け取ったあなた自身/自団体）は取引先ではない。宛先は絶対に選ばないこと。
  迷ったら「誰がお金を受け取るのか（請求してきた側）」を取引先にする。宛先（支払う側）ではない。
- amountInclTax: 税込の合計金額（整数・カンマ/円記号なし）。「請求金額」「合計」「ご請求額」など総額。
- documentType: invoice=請求書 / receipt=領収書 / quote=見積書 / delivery=納品書 / other。
- registrationNumber: 適格請求書の登録番号 "T"+13桁。無ければ null。`;

async function callGemini(base64, mimeType, orgName) {
  const key = await geminiApiKey();
  const model = process.env.GEMINI_MODEL_LITE || "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  // 受取側（自団体）名をAIへ渡し、宛先を取引先に選ばせない
  const selfLine = orgName
    ? `\n\n★この証憑を受け取ったのは「${orgName}」です（＝あなた自身＝宛先＝支払う側）。partnerName に「${orgName}」やその略称・法人格違いを絶対に選ばないこと。それは宛先であって取引先ではありません。`
    : "";
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: PROMPT + selfLine },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });

  // レート制限(429)・一時的過負荷(503)は待って自動リトライ（指数バックオフ）
  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body,
    });
    if (res.ok) break;
    const status = res.status;
    const errText = (await res.text()).slice(0, 200);
    if ((status === 429 || status === 503) && attempt < 4) {
      await sleep(1500 * 2 ** attempt); // 1.5s, 3s, 6s, 12s
      continue;
    }
    const e = new Error(`Gemini ${status}: ${errText}`);
    // 429/503 は一時障害。SQSで後ほど再試行させる。
    if (status === 429 || status === 503) e.retryable = true;
    throw e;
  }
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty response");
  const parsed = JSON.parse(text);
  // [COST-DEBUG] 使用トークンを記録（★本番前に削除★）
  const um = j?.usageMetadata || {};
  parsed.usage = {
    inputTokens: Number(um.promptTokenCount || 0),
    outputTokens: Number(um.candidatesTokenCount || 0),
    totalTokens: Number(um.totalTokenCount || 0),
    model,
  };
  return parsed;
}
