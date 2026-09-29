// 【読み取り専用】データの所在を確認する診断スクリプト。
// DBへの書き込みは一切しない（SELECTのみ・トランザクションは必ずROLLBACKで終える）。
// 使い方（CloudShell等）:
//   export DB_CLUSTER_ARN=... DB_SECRET_ARN=... DB_NAME=poitto
//   node db/diagnose.mjs
import {
  RDSDataClient,
  ExecuteStatementCommand,
  BeginTransactionCommand,
  RollbackTransactionCommand,
} from "@aws-sdk/client-rds-data";

const resourceArn = process.env.DB_CLUSTER_ARN;
const secretArn = process.env.DB_SECRET_ARN;
const database = process.env.DB_NAME || "poitto";

if (!resourceArn || !secretArn) {
  console.error("環境変数 DB_CLUSTER_ARN と DB_SECRET_ARN を設定してください。");
  process.exit(1);
}

const region = resourceArn.split(":")[3] || process.env.AWS_REGION;
const client = new RDSDataClient({ region });

/** 0 ACUからの復帰を待ちながら送信 */
async function send(cmd) {
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      return await client.send(cmd);
    } catch (err) {
      const msg = `${err?.name ?? ""} ${err?.message ?? ""}`;
      if (
        /resuming|not currently available|starting|DatabaseResuming|Communications link/i.test(msg) &&
        attempt < 14
      ) {
        console.log("  データベース起動中… 8秒後に再試行します");
        await new Promise((r) => setTimeout(r, 8000));
        continue;
      }
      throw err;
    }
  }
}

function rows(res) {
  const meta = res.columnMetadata || [];
  return (res.records || []).map((r) => {
    const o = {};
    r.forEach((f, i) => {
      o[meta[i].label || meta[i].name] = f.isNull
        ? null
        : f.stringValue ?? f.longValue ?? f.doubleValue ?? f.booleanValue ?? null;
    });
    return o;
  });
}

async function query(sql, parameters = [], transactionId) {
  const res = await send(
    new ExecuteStatementCommand({
      resourceArn,
      secretArn,
      database,
      sql,
      parameters,
      transactionId,
      includeResultMetadata: true,
    }),
  );
  return rows(res);
}

console.log("=== 組織（テナント）一覧 ===");
const tenants = await query(
  `select id::text as id, name, to_char(created_at,'YYYY-MM-DD HH24:MI') as created
     from tenants order by created_at`,
);
if (tenants.length === 0) console.log("（テナントがありません）");

for (const t of tenants) {
  // 行レベルセキュリティのため、テナントごとにトランザクション内で参照する（必ずROLLBACK）
  const { transactionId } = await send(
    new BeginTransactionCommand({ resourceArn, secretArn, database }),
  );
  try {
    await query(
      "select set_config('app.tenant_id', :tid, true)",
      [{ name: "tid", value: { stringValue: t.id } }],
      transactionId,
    );
    const [s] = await query(
      `select count(*) as total,
              count(*) filter (where deleted_at is null) as active,
              count(*) filter (where deleted_at is not null) as trashed,
              count(*) filter (where status = 'stored' and deleted_at is null) as stored,
              count(*) filter (where status = 'review' and deleted_at is null) as review,
              count(*) filter (where status = 'error' and deleted_at is null) as error,
              to_char(max(uploaded_at),'YYYY-MM-DD HH24:MI') as last_upload
         from documents`,
      [],
      transactionId,
    );
    console.log(
      `\n■ ${t.name}\n  テナントID: ${t.id}\n  作成: ${t.created}\n` +
        `  証憑 合計:${s.total}（有効:${s.active} ／ ゴミ箱:${s.trashed}）` +
        `  内訳 保存済み:${s.stored} 要確認:${s.review} エラー:${s.error}\n` +
        `  最終投函: ${s.last_upload ?? "なし"}`,
    );
  } finally {
    await send(
      new RollbackTransactionCommand({ resourceArn, secretArn, transactionId }),
    ).catch(() => {});
  }
}
console.log("\n✅ 診断完了（DBへの変更はありません）");
