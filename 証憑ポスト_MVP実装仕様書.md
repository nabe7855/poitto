# 証憑ポスト（ポイッと／POITTO）MVP実装仕様書

> 本書は「実装の正」。与えられた受入基準・要件・ブランド指針から起草した作業版です。
> 原本の仕様書が届いた場合は本書と突き合わせて差分調整します。
> 旧コードネーム「証憑ポスト」＝プロダクト名「ポイッと（POITTO）」。

---

## 1. 目的・コンセプト

証憑（請求書・領収書など）を「投函」するだけで、AIが項目抽出 → 統一名にリネーム → 月別に自動保存 → 索引化する、電子帳簿保存法（電子取引データ保存）対応のファイリングSaaS。

ひとこと：**入れるだけで、証憑がかたづく。**

### 電子帳簿保存法・検索要件（重要）
電子取引データは、次の3項目で検索できることが必須（検索要件）。本アプリの検索・保存設計はこれを満たす。
- 取引年月日（範囲指定可）
- 取引金額（範囲指定可）
- 取引先

---

## 2. 全体フロー

```
投函(アップロード/撮影)
   → 抽出(AI: 項目抽出 + 確信度)
      → [高確信] 命名 → 月別保存 → 索引化(一覧/検索に反映)
      → [低確信] 確認キューへ(要確認) → 人が修正・確定 → 命名 → 保存 → 索引化
```

各ステップで監査ログ（create / extract / confirm / update / export など）を記録する。

---

## 3. データモデル（PostgreSQL・標準SQLの範囲）

マルチテナント。全業務テーブルに `tenant_id` を持たせ、RLSでテナント越境を遮断する。
※ フェーズ2ではモック（インメモリ）で表現。DDL/RLSはフェーズ5で適用。

### 3.1 主なenum
- `doc_type`: `invoice`(請求書) / `receipt`(領収書) / `quote`(見積書) / `delivery`(納品書) / `other`(その他)
- `doc_status`: `extracting`(抽出中) / `review`(要確認) / `stored`(保存済み) / `error`(エラー)

### 3.2 テーブル（概略）

```sql
-- テナント（組織）
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_at    timestamptz not null default now()
);

-- 利用者（Cognito sub と対応）
create table users (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  cognito_sub   text not null unique,
  email         text not null,
  display_name  text,
  created_at    timestamptz not null default now()
);

-- 証憑
create table documents (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id),
  status              text not null,                 -- doc_status
  -- 原本
  original_s3_key     text,
  mime_type           text,
  size_bytes          bigint,
  -- 抽出項目（確定値）
  transaction_date    date,                          -- 取引年月日
  partner_name        text,                          -- 取引先名
  amount_incl_tax     bigint,                        -- 税込金額（円・整数）
  document_type       text,                          -- doc_type
  registration_number text,                          -- 適格請求書 登録番号 T+13桁
  -- 抽出メタ（確信度など）
  extraction          jsonb,                         -- フィールド別の value/confidence, model, raw
  overall_confidence  numeric(4,3),                  -- 0.000〜1.000
  -- 命名・保存
  file_name           text,                          -- 260630_佐川急便株式会社_71610_請求書.pdf
  stored_path         text,                          -- 保存済み/2026年06月/
  -- 監査
  uploaded_by         uuid references users(id),
  uploaded_at         timestamptz not null default now(),
  confirmed_by        uuid references users(id),
  confirmed_at        timestamptz
);

create index idx_documents_tenant_date    on documents (tenant_id, transaction_date);
create index idx_documents_tenant_partner on documents (tenant_id, partner_name);
create index idx_documents_tenant_amount  on documents (tenant_id, amount_incl_tax);

-- 監査ログ
create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  document_id   uuid references documents(id),
  action        text not null,                       -- create / extract / confirm / update / export / delete
  actor_id      uuid references users(id),
  detail        jsonb,
  created_at    timestamptz not null default now()
);
```

### 3.3 RLS（フェーズ5で適用）
```sql
alter table documents  enable row level security;
alter table audit_logs enable row level security;
-- 例：セッション変数 app.tenant_id とテナント一致行のみ可視
create policy tenant_isolation_documents on documents
  using (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 4. 命名規則

`取引年月日_取引先名_税込金額_書類の種類.拡張子`

- 取引年月日：`YYMMDD`（例 2026-06-30 → `260630`）
- 取引先名：抽出値そのまま（法人格含む）。ファイル名禁止文字（`\ / : * ? " < > |`）は全角化 or 除去。
- 税込金額：桁区切りなし整数（例 `71610`）
- 書類の種類：日本語表示名（請求書 / 領収書 / 見積書 / 納品書 / その他）

例：`260630_佐川急便株式会社_71610_請求書.pdf`
保存先：`保存済み/2026年06月/`

---

## 5. 抽出契約（Extractor インターフェース）

移植性のため、AI抽出は必ず `Extractor` インターフェース越しに使う（フェーズ3=モック実装、フェーズ4=Gemini実装）。

### 5.1 型（TypeScript）
```ts
export type DocType = "invoice" | "receipt" | "quote" | "delivery" | "other";

export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0..1
}

export interface ExtractionResult {
  transactionDate: ExtractedField<string>;      // "YYYY-MM-DD"
  partnerName: ExtractedField<string>;
  amountInclTax: ExtractedField<number>;         // 円・整数（税込）
  documentType: ExtractedField<DocType>;
  registrationNumber: ExtractedField<string | null>; // "T"+13桁 or null
  overallConfidence: number;                     // 0..1
  model: string;                                 // 使用モデル名
  raw?: unknown;                                 // モデル生出力（デバッグ用）
}

export interface ExtractionInput {
  fileName: string;
  mimeType: string;
  data: ArrayBuffer | string; // バイナリ or base64
  nativeText?: string;        // テキストPDFのネイティブ抽出結果（あれば）
}

export interface Extractor {
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
```

### 5.2 要確認の判定（振り分け）
- 必須項目：`transactionDate` / `partnerName` / `amountInclTax` / `documentType`
- しきい値 `REVIEW_THRESHOLD = 0.85`
- いずれかの必須項目が「欠落」または「confidence < 0.85」→ `status = review`（確認キュー）
- 全必須項目が 0.85 以上 → `status = stored`（自動保存）
- 確認キューでは、低確信の項目をアンバー色でハイライトする。

### 5.3 Gemini 構造化出力（JSON Schema・フェーズ4）
Gemini（既定 Flash-Lite、低確信のみ上位 Flash）に以下スキーマで応答させる。
```jsonc
{
  "type": "object",
  "properties": {
    "transactionDate":     { "type": "string", "description": "YYYY-MM-DD" },
    "partnerName":         { "type": "string" },
    "amountInclTax":       { "type": "integer", "description": "税込・円" },
    "documentType":        { "type": "string", "enum": ["invoice","receipt","quote","delivery","other"] },
    "registrationNumber":  { "type": ["string","null"], "description": "T+13桁 or null" },
    "confidence": {
      "type": "object",
      "properties": {
        "transactionDate":    { "type": "number" },
        "partnerName":        { "type": "number" },
        "amountInclTax":      { "type": "number" },
        "documentType":       { "type": "number" },
        "registrationNumber": { "type": "number" }
      },
      "required": ["transactionDate","partnerName","amountInclTax","documentType"]
    }
  },
  "required": ["transactionDate","partnerName","amountInclTax","documentType","confidence"]
}
```

---

## 6. API（概略・フェーズ5で実装）

| メソッド | パス | 用途 |
|---|---|---|
| POST | `/documents` | 投函（署名付きURL発行→S3 PUT）。作成後 SQS 経由で抽出。 |
| GET  | `/documents` | 一覧・検索（`from,to,amountMin,amountMax,partner,type,status`） |
| GET  | `/documents/:id` | 単票取得（原本の署名付きURL含む） |
| PATCH| `/documents/:id` | 確認キューでの修正・確定（confirm） |
| GET  | `/months/:ym` | 月別サマリー（件数・合計・一覧） |
| GET  | `/export.csv` | 検索条件でCSV出力 |

認証：Cognito JWT（Authorizationヘッダ）。テナントは JWT クレームから解決し RLS に反映。

---

## 7. 画面仕様（フェーズ2でモック実装）

共通：サイドバー＋ヘッダー。ナビ＝ホーム / 投函 / **確認** / 月別一覧 / 検索 / 設定。
（確認キューは業務上重要なため独立ナビとし、要確認件数バッジを表示。）

### 7.1 ダッシュボード（ホーム `/`）
- サマリーカード：今月の投函 / 要確認 / 保存済み / 今月の合計金額
- 「投函する」導線、最近の証憑リスト、要確認への導線。

### 7.2 投函ボックス（`/post`）
- ドラッグ＆ドロップのドロップゾーン（ホバー/ドラッグ状態を明示）
- ファイル選択、（スマホ）カメラ撮影ボタン
- 投函直後の処理状況（抽出中→要確認/保存済み）を擬似表示。

### 7.3 確認キュー（`/review`）
- 左：原本プレビュー（フェーズ2はプレースホルダ）
- 右：抽出項目フォーム（取引年月日 / 取引先 / 税込金額 / 種別 / 登録番号）
- 低確信の項目をアンバーでハイライト、確信度バッジ表示
- 「確定して保存」ボタン、キュー内の前後移動。

### 7.4 月別ビュー（`/months`）
- 月セレクタ（例 2026年06月）
- その月の件数・合計金額
- 一覧（ファイル名・取引先・金額・日付・種別）。

### 7.5 証憑一覧・検索（`/search`）
- 条件：取引年月日（範囲）/ 税込金額（範囲）/ 取引先（部分一致）/ 種別 / ステータス
- 複合条件で絞り込み、結果テーブル、件数・合計
- CSV出力ボタン。

### 7.6 設定（`/settings`）
- 組織情報、命名ルール、（将来）メンバー・保存先・エクスポート。

---

## 8. 受入基準（サンプルPDFで検証）

サンプル請求書（佐川急便／2026-06-30締／税込71,610円）を投函したとき：
- 抽出：日付=2026-06-30、取引先=佐川急便株式会社、税込金額=71610、種別=請求書、登録番号=T8130001000053
- ファイル名=`260630_佐川急便株式会社_71610_請求書.pdf`、保存先=`保存済み/2026年06月/`
- 一覧に表示／取引先「佐川」で検索ヒット／6/1〜6/30の範囲でヒット／CSV出力に1行
- 監査ログに create / extract / confirm／別テナントからは不可視／スマホ幅(375px)で崩れない
