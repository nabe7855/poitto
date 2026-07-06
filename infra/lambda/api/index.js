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
  // JWTのcustom:org_nameに合わせて組織名を作成/更新（設定画面での変更を反映）
  await execOne(
    `insert into tenants (id, name) values (:tid::uuid, :name)
     on conflict (id) do update set name = excluded.name`,
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
    // ゴミ箱（削除済み一覧）
    if (routeKey === "GET /trash") {
      return json(200, await listTrash(tenantId));
    }
    // 操作履歴
    if (routeKey === "GET /audit") {
      return json(200, await listAudit(tenantId));
    }
    // 復元
    if (routeKey === "POST /documents/{id}/restore" && event.pathParameters?.id) {
      return json(200, await restoreDocument(tenantId, event.pathParameters.id));
    }
    // 部分更新（確定・メモ・分類タグ など送られた項目だけ更新）
    if (method === "PATCH" && event.pathParameters?.id) {
      const body = JSON.parse(event.body || "{}");
      return json(200, await updateDocument(tenantId, event.pathParameters.id, body));
    }
    // ゴミ箱へ（ソフト削除）
    if (method === "DELETE" && event.pathParameters?.id) {
      return json(200, await deleteDocument(tenantId, event.pathParameters.id));
    }
    // 単票取得
    if (method === "GET" && event.pathParameters?.id) {
      return json(200, await getDocument(tenantId, event.pathParameters.id));
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
    const conds = ["tenant_id = :tid::uuid", "deleted_at is null"];
    const params = { tid: tenantId };
    if (q.from) { conds.push("transaction_date >= :from"); params.from = q.from; }
    if (q.to) { conds.push("transaction_date <= :to"); params.to = q.to; }
    if (q.amountMin) { conds.push("amount_incl_tax >= :amin"); params.amin = Number(q.amountMin); }
    if (q.amountMax) { conds.push("amount_incl_tax <= :amax"); params.amax = Number(q.amountMax); }
    if (q.partner) { conds.push("partner_name LIKE :pn"); params.pn = `%${q.partner}%`; }
    if (q.type && q.type !== "all") { conds.push("document_type = :dt"); params.dt = q.type; }
    if (q.status && q.status !== "all") { conds.push("status = :st"); params.st = q.status; }

    const rows = await exec(
      `select id::text as id, status, to_char(transaction_date,'YYYY-MM-DD') as transaction_date,
              partner_name, amount_incl_tax, document_type, registration_number,
              file_name, stored_path, memo, department, account, model, overall_confidence,
              mime_type, size_bytes, extraction,
              to_char(uploaded_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as uploaded_at
         from documents
        where ${conds.join(" and ")}
        order by uploaded_at desc
        limit 500`,
      params,
    );
    return { documents: rows };
  });
}

async function createDocument(tenantId, body) {
  const key = `originals/${tenantId}/${Date.now()}_${body.fileName || "upload"}`;
  const uploadUrl = await presignPut(key, body.mimeType || "application/pdf");
  const id = await withTenant(tenantId, async (exec) => {
    const rows = await exec(
      `insert into documents (tenant_id, status, original_s3_key, mime_type, size_bytes)
       values (:tid::uuid, 'extracting', :key, :mime, :size)
       returning id::text as id`,
      {
        tid: tenantId,
        key,
        mime: body.mimeType || "application/pdf",
        size: body.sizeBytes || 0,
      },
    );
    await exec(
      `insert into audit_logs (tenant_id, document_id, action, detail)
       values (:tid::uuid, :did::uuid, 'create', :detail::jsonb)`,
      {
        tid: tenantId,
        did: rows[0].id,
        detail: JSON.stringify({ fileName: body.fileName }),
      },
    );
    return rows[0].id;
  });
  // クライアントは uploadUrl に PUT → S3イベントで抽出キューへ
  return { id, uploadUrl, s3Key: key };
}

async function getDocument(tenantId, id) {
  return withTenant(tenantId, async (exec) => {
    const rows = await exec(`select * from documents where id = :id::uuid`, { id });
    const doc = rows[0];
    if (!doc) return { error: "not found" };
    if (doc.original_s3_key) doc.previewUrl = await presignGet(doc.original_s3_key);
    return { document: doc };
  });
}

// 部分更新: body に含まれる項目だけを更新する（メモ・分類タグ・確定などに共通）。
// body.confirm=true のときは要確認→保存済みへ確定する。
async function updateDocument(tenantId, id, body) {
  // JSプロパティ名 → DB列名（許可リスト）
  const COLS = {
    transactionDate: "transaction_date",
    partnerName: "partner_name",
    amountInclTax: "amount_incl_tax",
    documentType: "document_type",
    registrationNumber: "registration_number",
    fileName: "file_name",
    storedPath: "stored_path",
    memo: "memo",
    department: "department",
    account: "account",
  };
  const CAST = { transaction_date: "::date" };

  return withTenant(tenantId, async (exec) => {
    const sets = [];
    const params = { id };
    for (const [key, col] of Object.entries(COLS)) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        sets.push(`${col} = :${col}${CAST[col] || ""}`);
        // 空文字は NULL 扱い。数値列は数値化。
        let v = body[key];
        if (v === "" || v === undefined) v = null;
        if (col === "amount_incl_tax" && v != null) v = Number(v);
        params[col] = v;
      }
    }
    if (body.confirm) {
      sets.push("status = 'stored'", "confirmed_at = now()");
    }
    if (sets.length === 0) return { ok: true };

    await exec(
      `update documents set ${sets.join(", ")} where id = :id::uuid`,
      params,
    );
    await exec(
      `insert into audit_logs (tenant_id, document_id, action, detail)
       values (:tid::uuid, :id::uuid, :action, :detail::jsonb)`,
      {
        tid: tenantId,
        id,
        action: body.confirm ? "confirm" : "update",
        detail: JSON.stringify({ by: "user" }),
      },
    );
    return { ok: true };
  });
}

// ソフト削除（ゴミ箱へ）。原本S3は保持（電帳法の削除履歴のため）。
async function deleteDocument(tenantId, id) {
  return withTenant(tenantId, async (exec) => {
    await exec(
      `update documents set deleted_at = now()
        where id = :id::uuid and deleted_at is null`,
      { id },
    );
    await exec(
      `insert into audit_logs (tenant_id, document_id, action, detail)
       values (:tid::uuid, :id::uuid, 'delete', :detail::jsonb)`,
      { tid: tenantId, id, detail: JSON.stringify({ message: "ゴミ箱へ移動" }) },
    );
    return { ok: true };
  });
}

// 復元
async function restoreDocument(tenantId, id) {
  return withTenant(tenantId, async (exec) => {
    await exec(
      `update documents set deleted_at = null where id = :id::uuid`,
      { id },
    );
    await exec(
      `insert into audit_logs (tenant_id, document_id, action, detail)
       values (:tid::uuid, :id::uuid, 'update', :detail::jsonb)`,
      { tid: tenantId, id, detail: JSON.stringify({ message: "ゴミ箱から復元" }) },
    );
    return { ok: true };
  });
}

// ゴミ箱（削除済み一覧）
async function listTrash(tenantId) {
  return withTenant(tenantId, async (exec) => {
    const rows = await exec(
      `select id::text as id, status, to_char(transaction_date,'YYYY-MM-DD') as transaction_date,
              partner_name, amount_incl_tax, document_type, registration_number,
              file_name, stored_path, memo, department, account, model, overall_confidence,
              mime_type, size_bytes, extraction,
              to_char(uploaded_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as uploaded_at
         from documents
        where tenant_id = :tid::uuid and deleted_at is not null
        order by deleted_at desc
        limit 500`,
      { tid: tenantId },
    );
    return { documents: rows };
  });
}

// 操作履歴（訂正・削除の履歴）
async function listAudit(tenantId) {
  return withTenant(tenantId, async (exec) => {
    const rows = await exec(
      `select a.id::text as id, a.action, a.detail::text as detail,
              a.document_id::text as document_id,
              d.partner_name,
              to_char(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as created_at
         from audit_logs a
         left join documents d on d.id = a.document_id
        where a.tenant_id = :tid::uuid
        order by a.created_at desc
        limit 200`,
      { tid: tenantId },
    );
    return { logs: rows };
  });
}

async function monthSummary(tenantId, ym) {
  return withTenant(tenantId, async (exec) => {
    const rows = await exec(
      `select count(*) as count, coalesce(sum(amount_incl_tax),0) as total
         from documents
        where tenant_id = :tid::uuid and status = 'stored' and deleted_at is null
          and to_char(transaction_date, 'YYYY-MM') = :ym`,
      { tid: tenantId, ym },
    );
    return { ym, ...rows[0] };
  });
}
