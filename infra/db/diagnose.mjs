// 【読み取り専用】データの所在を確認する診断スクリプト。
// DBへの書き込みは一切しない（SELECTのみ）。
// 使い方（CloudShell等）:
//   export DB_CLUSTER_ARN=... DB_SECRET_ARN=... DB_NAME=poitto
//   node db/diagnose.mjs
import {
  RDSDataClient,
  ExecuteStatementCommand,
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

// 管理者接続ではRLSが素通りになるため、tenant_id で明示的に集計する（正確な組織別件数）
console.log("=== 組織ごとの証憑件数（tenant_idで明示集計） ===");
const byTenant = await query(
  `select coalesce(t.name, '(組織名なし)') as name,
          t.id::text as tid,
          to_char(t.created_at,'YYYY-MM-DD HH24:MI') as created,
          count(d.id) as total,
          count(d.id) filter (where d.deleted_at is null) as active,
          count(d.id) filter (where d.deleted_at is not null) as trashed,
          to_char(max(d.uploaded_at),'YYYY-MM-DD HH24:MI') as last_upload
     from tenants t
     left join documents d on d.tenant_id = t.id
    group by t.id, t.name, t.created_at
    order by count(d.id) desc, t.created_at`,
);
for (const r of byTenant) {
  console.log(
    `■ ${r.name}\n  テナントID: ${r.tid}（作成 ${r.created}）\n` +
      `  証憑 合計:${r.total}（有効:${r.active} ／ ゴミ箱:${r.trashed}）  最終投函: ${r.last_upload ?? "なし"}`,
  );
}
const [orphan] = await query(
  `select count(*) as n from documents d
    where not exists (select 1 from tenants t where t.id = d.tenant_id)`,
);
console.log(`\n（組織に紐づかない証憑: ${orphan.n} 件）`);

console.log("\n✅ 診断完了（DBへの変更はありません）");
