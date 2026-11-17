"use strict";
// ポイッと API ハンドラ（HTTP API + Cognito JWT）。
// テナントはJWTのカスタム属性 custom:tenant_id から取得し、RLSへ渡す。

const { withTenant, execOne, isResuming } = require("../shared/db");
const { presignGet, presignPut } = require("../shared/storage");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ── 支払い管理 ──
const PAYMENT_STATUSES = ["unpaid", "paid", "not_applicable"];
const PAYMENT_METHODS = ["transfer", "debit", "card", "cash"];
// 一覧で返す支払い列（DBに列が無い環境では使わない＝従来どおり）
const PAYMENT_SELECT = `,
              to_char(due_date,'YYYY-MM-DD') as due_date,
              to_char(paid_at,'YYYY-MM-DD') as paid_at,
              payment_status, payment_method`;

/** 支払い列がまだDBに無い（スキーマ未適用）ことを示すエラーか */
function isMissingColumn(err) {
  return /column .* does not exist|42703/i.test(`${(err && err.message) || ""}`);
}

/** "YYYY-MM-DD" として実在する日付か（不正値はDBのキャストで失敗するため弾く） */
function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
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

  const method = event.requestContext?.http?.method;
  const routeKey = event.routeKey || `${method} ${event.rawPath}`;

  try {
    await ensureTenant(tenantId, orgName);
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
    // 支払い状況の一括更新（まとめて消し込み・過去分の整理）
    if (routeKey === "POST /payments/bulk") {
      const body = JSON.parse(event.body || "{}");
      return json(200, await bulkUpdatePayments(tenantId, body));
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
    // DBの寝起き中は「一時的に利用不可」を返し、画面側で再試行させる
    if (isResuming(err)) {
      return json(503, { error: "database is resuming", retryable: true });
    }
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

    const sql = (extra) =>
      `select id::text as id, status, to_char(transaction_date,'YYYY-MM-DD') as transaction_date,
              partner_name, amount_incl_tax, document_type, registration_number,
              file_name, stored_path, memo, department, account, model, overall_confidence,
              mime_type, size_bytes, extraction,
              to_char(uploaded_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as uploaded_at${extra}
         from documents
        where ${conds.join(" and ")}
        order by uploaded_at desc
        limit 500`;
    return { documents: await exec(sql(PAYMENT_SELECT), params), features: { payments: true } };
  }).catch(async (err) => {
    // 支払い列がまだ無いDB（スキーマ未適用）では従来どおりの一覧を返す
    if (!isMissingColumn(err)) throw err;
    console.warn("payment columns missing; falling back to legacy list");
    return { ...(await listDocumentsLegacy(tenantId, q)), features: { payments: false } };
  });
}

async function listDocumentsLegacy(tenantId, q) {
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
    // 自組織の証憑のみ（行レベルセキュリティに加え、アプリ側でも組織で絞る）
    const rows = await exec(
      `select * from documents where id = :id::uuid and tenant_id = :tid::uuid`,
      { id, tid: tenantId },
    );
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
    // 支払い管理
    paymentStatus: "payment_status",
    dueDate: "due_date",
    paidAt: "paid_at",
    paymentMethod: "payment_method",
  };
  const CAST = { transaction_date: "::date", due_date: "::date", paid_at: "::date" };

  return withTenant(tenantId, async (exec) => {
    const sets = [];
    const params = { id, tid: tenantId };
    for (const [key, col] of Object.entries(COLS)) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        // 空文字は NULL 扱い。数値列は数値化。
        let v = body[key];
        if (v === "" || v === undefined) v = null;
        if (col === "amount_incl_tax" && v != null) v = Number(v);
        // 支払い項目は値を検証（不正値は保存しない）
        if (col === "payment_status" && v != null && !PAYMENT_STATUSES.includes(v)) continue;
        if (col === "payment_method" && v != null && !PAYMENT_METHODS.includes(v)) continue;
        if ((col === "due_date" || col === "paid_at") && v != null && !validDate(v)) continue;
        sets.push(`${col} = :${col}${CAST[col] || ""}`);
        params[col] = v;
      }
    }
    if (body.confirm) {
      sets.push("status = 'stored'", "confirmed_at = now()");
    }
    if (sets.length === 0) return { ok: true };

    // 自組織の証憑だけを更新（他組織のIDを指定されても何も起きない）
    const updated = await exec(
      `update documents set ${sets.join(", ")}
        where id = :id::uuid and tenant_id = :tid::uuid
        returning id::text as id`,
      params,
    );
    if (updated.length === 0) return { ok: true };

    await exec(
      `insert into audit_logs (tenant_id, document_id, action, detail)
       values (:tid::uuid, :id::uuid, :action, :detail::jsonb)`,
      {
        tid: tenantId,
        id,
        action: body.confirm ? "confirm" : "update",
        detail: JSON.stringify(auditDetailFor(body)),
      },
    );
    return { ok: true };
  });
}

/** 操作履歴に残す説明（支払いの変更は内容が分かるように） */
function auditDetailFor(body) {
  const d = { by: "user" };
  if (body.paymentStatus === "paid")
    d.message = `支払い済みにしました${body.paidAt ? `（${body.paidAt}）` : ""}`;
  else if (body.paymentStatus === "unpaid") d.message = "未払いに戻しました";
  else if (body.paymentStatus === "not_applicable") d.message = "支払いの対象外にしました";
  else if (Object.prototype.hasOwnProperty.call(body, "dueDate"))
    d.message = `支払期日を${body.dueDate || "未設定"}に変更しました`;
  else if (Object.prototype.hasOwnProperty.call(body, "paymentMethod"))
    d.message = "支払方法を変更しました";
  return d;
}

/**
 * 支払い状況の一括更新。body: { ids: string[], paymentStatus, paidAt?, paymentMethod? }
 * 自組織の証憑のみ対象。100件ずつまとめて更新する。
 */
async function bulkUpdatePayments(tenantId, body) {
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x))
    : [];
  const status = body.paymentStatus;
  if (ids.length === 0 || !PAYMENT_STATUSES.includes(status)) {
    return { ok: false, updated: 0 };
  }
  const paidAt = status === "paid" && validDate(body.paidAt) ? body.paidAt : null;
  const method = PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : null;

  const list = ids.slice(0, 500);
  const detail = JSON.stringify(auditDetailFor({ paymentStatus: status, paidAt }));
  let updated = 0;
  await withTenant(tenantId, async (exec) => {
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const idParams = {};
      const placeholders = chunk.map((id, j) => {
        idParams[`i${j}`] = id;
        return `:i${j}::uuid`;
      });
      const params = { tid: tenantId, st: status, pa: paidAt, ...idParams };
      const sets = ["payment_status = :st", "paid_at = :pa::date"];
      if (method) {
        sets.push("payment_method = :pm");
        params.pm = method;
      }
      const rows = await exec(
        `update documents set ${sets.join(", ")}
          where tenant_id = :tid::uuid and deleted_at is null
            and id in (${placeholders.join(", ")})
          returning id::text as id`,
        params,
      );
      updated += rows.length;
      if (rows.length === 0) continue;
      // 履歴は証憑ごとに残す（電帳法の訂正履歴として）。1文でまとめて記録。
      await exec(
        `insert into audit_logs (tenant_id, document_id, action, detail)
         select :tid::uuid, id, 'update', :detail::jsonb
           from documents
          where tenant_id = :tid::uuid and id in (${placeholders.join(", ")})`,
        { tid: tenantId, detail, ...idParams },
      );
    }
  });
  return { ok: true, updated };
}

// ソフト削除（ゴミ箱へ）。原本S3は保持（電帳法の削除履歴のため）。
async function deleteDocument(tenantId, id) {
  return withTenant(tenantId, async (exec) => {
    const updated = await exec(
      `update documents set deleted_at = now()
        where id = :id::uuid and tenant_id = :tid::uuid and deleted_at is null
        returning id::text as id`,
      { id, tid: tenantId },
    );
    if (updated.length === 0) return { ok: true };
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
    const updated = await exec(
      `update documents set deleted_at = null
        where id = :id::uuid and tenant_id = :tid::uuid
        returning id::text as id`,
      { id, tid: tenantId },
    );
    if (updated.length === 0) return { ok: true };
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
         left join documents d on d.id = a.document_id and d.tenant_id = a.tenant_id
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
