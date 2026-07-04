-- ポイッと（POITTO）データベーススキーマ（仕様書 §3）
-- 標準PostgreSQLの範囲。マルチテナント + 行レベルセキュリティ(RLS)。
-- Aurora Serverless v2 (PostgreSQL) 想定。RDS Data API 経由で利用。

-- 拡張（UUID生成）
create extension if not exists "pgcrypto";

-- ============================================================
-- テナント（組織）
-- ============================================================
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 利用者（Cognito sub と対応）
-- ============================================================
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  cognito_sub   text not null unique,
  email         text not null,
  display_name  text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_users_tenant on users (tenant_id);

-- ============================================================
-- 証憑
-- ============================================================
create table if not exists documents (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  status              text not null default 'extracting'
                        check (status in ('extracting','review','stored','error')),
  -- 原本（S3）
  original_s3_key     text,
  mime_type           text,
  size_bytes          bigint,
  -- 抽出項目（確定値）
  transaction_date    date,
  partner_name        text,
  amount_incl_tax     bigint,
  document_type       text
                        check (document_type in ('invoice','receipt','quote','delivery','other')),
  registration_number text,
  -- 抽出メタ
  extraction          jsonb,
  overall_confidence  numeric(4,3),
  model               text,
  -- 命名・保存
  file_name           text,
  stored_path         text,
  -- 任意メモ（目的・相手・場所など）
  memo                text,
  -- 監査
  uploaded_by         uuid references users(id),
  uploaded_at         timestamptz not null default now(),
  confirmed_by        uuid references users(id),
  confirmed_at        timestamptz
);

-- 電子帳簿保存法の検索要件（取引年月日・取引金額・取引先）を満たすインデックス
create index if not exists idx_documents_tenant_date    on documents (tenant_id, transaction_date);
create index if not exists idx_documents_tenant_partner on documents (tenant_id, partner_name);
create index if not exists idx_documents_tenant_amount  on documents (tenant_id, amount_incl_tax);
create index if not exists idx_documents_tenant_status  on documents (tenant_id, status);

-- 既存DB向け: memo列が無ければ追加（冪等）
alter table documents add column if not exists memo text;
-- ソフト削除（ゴミ箱）用。null=有効、非null=削除済み。電帳法の削除履歴のため原本は保持。
alter table documents add column if not exists deleted_at timestamptz;
create index if not exists idx_documents_tenant_deleted on documents (tenant_id, deleted_at);

-- ============================================================
-- 監査ログ
-- ============================================================
create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  document_id   uuid references documents(id) on delete set null,
  action        text not null
                  check (action in ('create','extract','confirm','update','export','delete')),
  actor_id      uuid references users(id),
  detail        jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_tenant_created on audit_logs (tenant_id, created_at desc);

-- ============================================================
-- 行レベルセキュリティ（RLS）
-- アプリはトランザクション内で `SET LOCAL app.tenant_id = '<uuid>'` を設定し、
-- 自テナントの行のみ可視・操作可能にする（別テナントからは不可視）。
-- ============================================================
alter table documents  enable row level security;
alter table audit_logs enable row level security;
alter table users      enable row level security;

-- FORCE: テーブル所有者（Data APIの接続ユーザー）にもRLSを強制。
-- これが無いと所有者はRLSをバイパスしてしまい、テナント分離が効かない。
alter table documents  force row level security;
alter table audit_logs force row level security;
alter table users      force row level security;

-- 既存ポリシーを作り直し（冪等）
drop policy if exists tenant_isolation_documents  on documents;
drop policy if exists tenant_isolation_audit_logs on audit_logs;
drop policy if exists tenant_isolation_users      on users;

create policy tenant_isolation_documents on documents
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenant_isolation_audit_logs on audit_logs
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenant_isolation_users on users
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
