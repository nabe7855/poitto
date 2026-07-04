// 組織(テナント)とログインユーザー(Cognito)を作成する初期セットアップ。
// 使い方（CloudShell）:
//   export DB_CLUSTER_ARN=... DB_SECRET_ARN=... DB_NAME=poitto
//   export USER_POOL_ID=ap-northeast-1_xxxx
//   export EMAIL="you@example.com" PASSWORD="Passw0rd!" ORG_NAME="団体名"
//   node setup-account.mjs
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const resourceArn = process.env.DB_CLUSTER_ARN;
const secretArn = process.env.DB_SECRET_ARN;
const database = process.env.DB_NAME || "poitto";
const userPoolId = process.env.USER_POOL_ID;
const email = process.env.EMAIL;
const password = process.env.PASSWORD;
const orgName = process.env.ORG_NAME || "サンプル組織";

for (const [k, v] of Object.entries({
  DB_CLUSTER_ARN: resourceArn,
  DB_SECRET_ARN: secretArn,
  USER_POOL_ID: userPoolId,
  EMAIL: email,
  PASSWORD: password,
})) {
  if (!v) {
    console.error(`環境変数 ${k} を設定してください。`);
    process.exit(1);
  }
}

const region = resourceArn.split(":")[3] || process.env.AWS_REGION;
const rds = new RDSDataClient({ region });
const idp = new CognitoIdentityProviderClient({ region });

async function sql(statement, parameters = []) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      return await rds.send(
        new ExecuteStatementCommand({
          resourceArn,
          secretArn,
          database,
          sql: statement,
          parameters,
          includeResultMetadata: true,
        }),
      );
    } catch (err) {
      const msg = `${err?.name ?? ""} ${err?.message ?? ""}`;
      if (/resuming|not currently available|starting/i.test(msg) && attempt < 11) {
        console.log("  データベース起動中… 8秒後に再試行します");
        await new Promise((r) => setTimeout(r, 8000));
        continue;
      }
      throw err;
    }
  }
}

// 1) テナント作成（同名があれば再利用）
console.log(`組織「${orgName}」を作成します…`);
let tenantId;
const existing = await sql("select id::text as id from tenants where name = :n limit 1", [
  { name: "n", value: { stringValue: orgName } },
]);
if (existing.records?.length) {
  tenantId = existing.records[0][0].stringValue;
  console.log("  既存の組織を使用:", tenantId);
} else {
  const ins = await sql("insert into tenants (name) values (:n) returning id::text as id", [
    { name: "n", value: { stringValue: orgName } },
  ]);
  tenantId = ins.records[0][0].stringValue;
  console.log("  作成しました:", tenantId);
}

// 2) Cognitoユーザー作成（確認メールは送らない）
console.log(`ログインユーザー「${email}」を作成します…`);
try {
  await idp.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:tenant_id", Value: tenantId },
      ],
    }),
  );
  console.log("  作成しました");
} catch (err) {
  if (err?.name === "UsernameExistsException") {
    console.log("  既に存在するユーザーです（パスワードのみ更新します）");
  } else {
    throw err;
  }
}

// 3) パスワードを確定（初回変更不要でそのままログインできる）
await idp.send(
  new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: email,
    Password: password,
    Permanent: true,
  }),
);
console.log("  パスワードを設定しました");

// ※ usersテーブルへの登録は任意（テナントはJWTのcustom:tenant_idから解決するため必須ではない）。

console.log("");
console.log("✅ セットアップ完了！");
console.log(`   組織ID(tenant_id): ${tenantId}`);
console.log(`   ログイン: ${email} / （設定したパスワード）`);
