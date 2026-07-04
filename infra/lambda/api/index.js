"use strict";
// ポイッと API ハンドラ（HTTP API + Cognito JWT）。
// テナントはJWTのカスタム属性 custom:tenant_id から取得し、RLSへ渡す。

const { withTenant, execOne } = require("../shared/db");
const { presignGet, presignPut } = require("../shared/storage");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** JWTクレームからテナント（=ユーザーのsub）・組織名・メールを取り出す */
function identity(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  return {
    tenantId: claims.sub, // 1アカウント=1組織。将来の複数ユーザーはusersで拡張。
    orgName: claims["custom:org_name"] || claims.email || "組織",
    email: claims.email,
  };
}

/** 組織(テナント)行が無ければ作成（RLS対象外のtenantsに単発upsert） */
async function ensureTenant(tenantId, orgName) {
  await execOne(
    `insert into tenants (id, name) values (:tid::uuid, :name)
     on conflict (id) do nothing`,
    { tid: tenantId, name: orgName },
  );
}

exports.handler = async (event) => {
  const { tenantId, orgName } = identity(event);
  if (!tenantId) return json(401, { error: "not authenticated" });
  await ensureTenant(tenantId, orgName);

  const method = event.requestContext?.http?.method;
  const routeKey = event.routeKey || `${method} ${event.rawPath}`;

  try {
    // 一覧・検索
    if (routeKey === "GET /documents") {
      const q = event.queryStringParameters || {};
      return json(200, await listDocuments(tenantId, q));
    }
    // 投函（署名付きURL発行 + レコード作成）
    if (routeKey === "POST /documents") {
      const body = JSON.parse(event.body || "{}");
      return json(201, await createDocument(tenantId, body));
    }
    // 単票取得
    if (method === "GET" && event.pathParameters?.id) {
      return json(200, await getDocument(tenantId, event.pathParameters.id));
    }
    // 確認キューでの確定
    if (method === "PATCH" && event.pathParameters?.id) {
      const body = JSON.parse(event.body || "{}");
      return json(200, await confirmDocument(tenantId, event.pathParameters.id, body));
    }
    // 月別サマリー
    if (method === "GET" && event.pathParameters?.ym) {
      return json(200, await monthSummary(tenantId, event.pathParameters.ym));
    }
    return json(404, { error: "not found", routeKey });
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message || "internal error" });
  }
};

async function listDocuments(tenantId, q) {
  return withTenant(tenantId, async (exec) => {
    const conds = ["tenant_id = :tid"];
    const params = { tid: tenantId };
    if (q.from) { conds.push("transaction_date >= :from"); params.from = q.from; }
    if (q.to) { conds.push("transaction_date <= :to"); params.to = q.to; }
    if (q.amountMin) { conds.push("amount_incl_tax >= :amin"); params.amin = Number(q.amountMin); }
    if (q.amountMax) { conds.push("amount_incl_tax <= :amax"); params.amax = Number(q.amountMax); }
    if (q.partner) { conds.push("partner_name LIKE :pn"); params.pn = `%${q.partner}%`; }
    if (q.type && q.type !== "all") { conds.push("document_type = :dt"); params.dt = q.type; }
    if (q.status && q.status !== "all") { conds.push("status = :st"); params.st = q.status; }

    const rows = await exec(
      `select id, status, transaction_date, partner_name, amount_incl_tax,
              document_type, registration_number, file_name, stored_path
         from documents
        where ${conds.join(" and ")}
        order by transaction_date desc nulls last
        limit 500`,
      params,
    );
    return { documents: rows };
  });
}

async function createDocument(tenantId, body) {
  const key = `originals/${tenantId}/${Date.now()}_${body.fileName || "upload"}`;
  const uploadUrl = await presignPut(key, body.mimeType || "application/pdf");
  await withTenant(tenantId, async (exec) => {
    await exec(
      `insert into documents (tenant_id, status, original_s3_key, mime_type, size_bytes)
       values (:tid, 'extracting', :key, :mime, :size)`,
      {
        tid: tenantId,
        key,
        mime: body.mimeType || "application/pdf",
        size: body.sizeBytes || 0,
      },
    );
    await exec(
      `insert into audit_logs (tenant_id, action, detail)
       values (:tid, 'create', :detail)`,
      { tid: tenantId, detail: JSON.stringify({ fileName: body.fileName }) },
    );
  });
  // クライアントは uploadUrl に PUT → S3イベントで抽出キューへ
  return { uploadUrl, s3Key: key };
}

async function getDocument(tenantId, id) {
  return withTenant(tenantId, async (exec) => {
    const rows = await exec(`select * from documents where id = :id`, { id });
    const doc = rows[0];
    if (!doc) return { error: "not found" };
    if (doc.original_s3_key) doc.previewUrl = await presignGet(doc.original_s3_key);
    return { document: doc };
  });
}

async function confirmDocument(tenantId, id, body) {
  return withTenant(tenantId, async (exec) => {
    await exec(
      `update documents set
          status = 'stored',
          transaction_date = :d,
          partner_name = :p,
          amount_incl_tax = :a,
          document_type = :t,
          registration_number = :r,
          file_name = :fn,
          stored_path = :sp,
          confirmed_at = now()
        where id = :id`,
      {
        id,
        d: body.transactionDate,
        p: body.partnerName,
        a: Number(body.amountInclTax),
        t: body.documentType,
        r: body.registrationNumber || null,
        fn: body.fileName || null,
        sp: body.storedPath || null,
      },
    );
    await exec(
      `insert into audit_logs (tenant_id, document_id, action, detail)
       values (:tid, :id, 'confirm', :detail)`,
      { tid: tenantId, id, detail: JSON.stringify({ by: "user" }) },
    );
    return { ok: true };
  });
}

async function monthSummary(tenantId, ym) {
  return withTenant(tenantId, async (exec) => {
    const rows = await exec(
      `select count(*) as count, coalesce(sum(amount_incl_tax),0) as total
         from documents
        where tenant_id = :tid and status = 'stored'
          and to_char(transaction_date, 'YYYY-MM') = :ym`,
      { tid: tenantId, ym },
    );
    return { ym, ...rows[0] };
  });
}
