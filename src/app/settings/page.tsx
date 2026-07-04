import {
  IconBuilding,
  IconTag,
  IconHistory,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/page-header";
import { MOCK_AUDIT_LOGS, getDocument } from "@/lib/mock-data";

export const metadata = { title: "設定" };

const ACTION_LABEL: Record<string, string> = {
  create: "投函",
  extract: "抽出",
  confirm: "確定",
  update: "修正",
  export: "出力",
  delete: "削除",
};

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className="text-ink/50">{icon}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-black/[0.05] py-2.5 last:border-0">
      <span className="text-sm text-ink/60">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="設定"
        description="組織情報・命名ルール・履歴を確認します。"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section icon={<IconBuilding size={18} stroke={1.75} />} title="組織情報">
          <Row label="組織名" value="サンプル合同会社" />
          <Row label="プラン" value="MVP（デモ）" />
          <Row label="保管リージョン" value="東京（ap-northeast-1）" />
        </Section>

        <Section icon={<IconTag size={18} stroke={1.75} />} title="命名ルール">
          <p className="text-sm text-ink/70">
            取引年月日_取引先名_税込金額_書類の種類
          </p>
          <p className="mt-2 break-all rounded-lg bg-background-soft px-3 py-2 font-mono text-sm text-ink/80">
            260630_佐川急便株式会社_71610_請求書.pdf
          </p>
          <p className="mt-2 text-xs text-ink/45">
            保存先：保存済み/2026年06月/（月別フォルダ）
          </p>
        </Section>

        <Section
          icon={<IconHistory size={18} stroke={1.75} />}
          title="監査ログ（最近）"
        >
          <div className="space-y-2">
            {MOCK_AUDIT_LOGS.map((log) => {
              const doc = log.documentId ? getDocument(log.documentId) : undefined;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 border-b border-black/[0.05] pb-2.5 last:border-0"
                >
                  <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md bg-black/[0.05] px-2 py-0.5 text-xs font-medium text-ink/70">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink/80">
                      {doc?.partnerName ?? "—"}
                      {log.detail && (
                        <span className="text-ink/45"> ・ {log.detail}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/40">
                      {log.actor} ・{" "}
                      {new Date(log.createdAt).toLocaleString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <p className="mt-4 text-xs text-ink/40">
        ※ フェーズ2はモック表示です。編集・メンバー管理・エクスポート設定はフェーズ5以降で有効化します。
      </p>
    </>
  );
}
