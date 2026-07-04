# ポイッと（POITTO）バックエンド（AWS CDK）

フェーズ5。CDKで以下を定義します（東京リージョン ap-northeast-1 想定）。

- **Cognito** ユーザープール（テナントIDを `custom:tenant_id` に保持し、JWT経由でRLSへ）
- **API Gateway (HTTP API)** + **Cognito JWTオーソライザ** → **Lambda**（documents CRUD/検索・月別）
- **Aurora Serverless v2 (PostgreSQL)** ＋ **RDS Data API**（`db/schema.sql` の DDL/RLS）
- **S3**（原本保管）→ **SQS** → **Lambda**（Geminiで非同期抽出）
- **Secrets Manager**（Gemini APIキー・DB認証情報）

設計原則：DB/ストレージ/認証はアダプタ越し（`lambda/shared/db.js`・`storage.js`）。SQLは標準PostgreSQL。秘密はコードに書かずSecrets Manager。

## 構成の検証（課金なし）

```bash
cd infra
npm install
npm run build      # tsc
npx cdk synth      # CloudFormationを生成（AWS認証不要）
```

## デプロイ（課金あり・要確認）

> ⚠️ Aurora Serverless v2 は最小構成でも継続課金されます。まず `cdk diff` で差分を確認してください。

前提：AWS CLI 導入済み・認証設定済み（`aws configure`）・対象アカウント/リージョンで一度だけ CDK ブートストラップ。

```bash
export CDK_DEFAULT_ACCOUNT=<アカウントID>
export CDK_DEFAULT_REGION=ap-northeast-1

npx cdk bootstrap                 # 初回のみ
npx cdk diff                      # 差分確認
npx cdk deploy                    # デプロイ（出力にUserPoolId/ApiUrl等）
```

## デプロイ後の初期設定

1. **DBスキーマ適用**：出力の `DbClusterArn` / `DbSecretArn` を使い、RDS Data API（コンソールのクエリエディタ or `aws rds-data execute-statement`）で `db/schema.sql` を実行。
2. **Geminiキー登録**：`aws secretsmanager put-secret-value --secret-id poitto/gemini-api-key --secret-string '{"apiKey":"..."}'`
3. **テナント/ユーザー作成**：`tenants` に組織、Cognitoユーザーの `custom:tenant_id` にそのUUIDを設定。
4. **フロント接続**：Vercel側に `NEXT_PUBLIC_API_URL`（出力 `ApiUrl`）と Cognito 設定を登録し、フロントの投函/一覧をこのAPIへ切替（インメモリ・ストアからの差し替え）。

## 破棄

```bash
npx cdk destroy   # RETAIN指定のS3/Cognito/Auroraは手動削除が必要な場合あり
```
