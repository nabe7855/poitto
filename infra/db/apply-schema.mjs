// schema.sql を Aurora（RDS Data API）へ適用する初期化スクリプト。
// 使い方（CloudShell等）:
//   export DB_CLUSTER_ARN=... DB_SECRET_ARN=... DB_NAME=poitto
//   node db/apply-schema.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");

/** 行コメント(--)を除去してから ; で分割 */
function toStatements(text) {
  const noComments = text
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  return noComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const client = new RDSDataClient({});

/** 0 ACUからの復帰(数十秒)を待ちながら実行 */
async function exec(statement) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      await client.send(
        new ExecuteStatementCommand({ resourceArn, secretArn, database, sql: statement }),
      );
      return;
    } catch (err) {
      const msg = `${err?.name ?? ""} ${err?.message ?? ""}`;
      const resuming =
        /resuming|not currently available|starting|DatabaseResuming|Communications link/i.test(
          msg,
        );
      if (resuming && attempt < 11) {
        console.log("  データベース起動中… 8秒後に再試行します");
        await new Promise((r) => setTimeout(r, 8000));
        continue;
      }
      throw err;
    }
  }
}

const statements = toStatements(sql);
console.log(`スキーマを適用します（${statements.length} 文）…`);
for (let i = 0; i < statements.length; i++) {
  const preview = statements[i].replace(/\s+/g, " ").slice(0, 60);
  process.stdout.write(`(${i + 1}/${statements.length}) ${preview} … `);
  await exec(statements[i]);
  console.log("OK");
}
console.log("✅ スキーマ適用が完了しました。");
