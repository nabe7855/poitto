"use strict";
// DatabaseAdapter（RDS Data API 実装）。
// 標準PostgreSQLを、トランザクション内で set_config('app.tenant_id',...) を効かせて実行し、
// RLSで自テナントのみに限定する。移植時はこのファイルを別ドライバ実装に差し替える。

const {
  RDSDataClient,
  ExecuteStatementCommand,
  BeginTransactionCommand,
  CommitTransactionCommand,
  RollbackTransactionCommand,
} = require("@aws-sdk/client-rds-data");

const client = new RDSDataClient({});
const resourceArn = process.env.DB_CLUSTER_ARN;
const secretArn = process.env.DB_SECRET_ARN;
const database = process.env.DB_NAME || "poitto";

/** Aurora Serverless v2 が 0 ACU から復帰する間、少し待って再試行する */
async function send(command) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await client.send(command);
    } catch (err) {
      const name = err && err.name;
      if (name === "DatabaseResumingException" && attempt < 9) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

/** JS値 → Data API パラメータ */
function toParam(name, value) {
  if (value === null || value === undefined) return { name, value: { isNull: true } };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { name, value: { longValue: value } }
      : { name, value: { doubleValue: value } };
  }
  if (typeof value === "boolean") return { name, value: { booleanValue: value } };
  return { name, value: { stringValue: String(value) } };
}

function paramsFrom(obj) {
  return Object.entries(obj || {}).map(([k, v]) => toParam(k, v));
}

/** Data APIの1行をプレーンオブジェクトへ */
function rowToObject(columnMeta, record) {
  const out = {};
  record.forEach((field, i) => {
    const name = columnMeta[i].label || columnMeta[i].name;
    out[name] = field.isNull
      ? null
      : field.stringValue ??
        field.longValue ??
        field.doubleValue ??
        field.booleanValue ??
        null;
  });
  return out;
}

/**
 * テナント境界内で複数SQLを実行する。
 * fn(exec) の exec(sql, params) は結果行の配列を返す。
 */
async function withTenant(tenantId, fn) {
  const begin = await send(
    new BeginTransactionCommand({ resourceArn, secretArn, database }),
  );
  const transactionId = begin.transactionId;

  const exec = async (sql, params) => {
    const res = await send(
      new ExecuteStatementCommand({
        resourceArn,
        secretArn,
        database,
        transactionId,
        sql,
        parameters: paramsFrom(params),
        includeResultMetadata: true,
      }),
    );
    if (!res.records) return [];
    const meta = res.columnMetadata || [];
    return res.records.map((r) => rowToObject(meta, r));
  };

  try {
    // RLS: このトランザクション内だけ tenant_id を固定。
    // ※ PostgreSQLの SET はパラメータ不可のため set_config(..., is_local=true) を使う。
    await exec("select set_config('app.tenant_id', :tid, true)", {
      tid: tenantId,
    });
    const result = await fn(exec);
    await send(
      new CommitTransactionCommand({ resourceArn, secretArn, transactionId }),
    );
    return result;
  } catch (err) {
    await send(
      new RollbackTransactionCommand({ resourceArn, secretArn, transactionId }),
    ).catch(() => {});
    throw err;
  }
}

/** テナント文脈なしの単発実行（RLS非対象のtenantsテーブル等に使用） */
async function execOne(sql, params) {
  const res = await send(
    new ExecuteStatementCommand({
      resourceArn,
      secretArn,
      database,
      sql,
      parameters: paramsFrom(params),
      includeResultMetadata: true,
    }),
  );
  if (!res.records) return [];
  const meta = res.columnMetadata || [];
  return res.records.map((r) => rowToObject(meta, r));
}

module.exports = { withTenant, execOne };
