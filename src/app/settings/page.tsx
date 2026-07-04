import {
  IconBuilding,
  IconTag,
  IconHistory,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogList, ResetDemoButton } from "@/components/settings/audit-log";
import { AccountSettings } from "@/components/settings/account-settings";
import { TrashSection } from "@/components/settings/trash-section";
import { activeExtractorName } from "@/lib/extractor";

export const metadata = { title: "設定" };

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
  const engine = activeExtractorName();
  return (
    <>
      <PageHeader
        title="設定"
        description="組織情報・命名ルール・履歴を確認します。"
      />

      <div className="mb-4">
        <AccountSettings />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section icon={<IconBuilding size={18} stroke={1.75} />} title="組織情報">
          <Row label="組織名" value="サンプル合同会社" />
          <Row label="プラン" value="MVP（デモ）" />
          <Row
            label="AI抽出エンジン"
            value={engine === "gemini" ? "Gemini（実接続）" : "モック（キー未設定）"}
          />
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
          title="操作履歴（訂正・削除の履歴）"
        >
          <AuditLogList />
        </Section>
      </div>

      <div className="mt-4">
        <TrashSection />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink/40">
          ※ 保存先はブラウザ内（インメモリ／localStorage）のデモです。編集・メンバー管理・実保管はフェーズ5以降で有効化します。
        </p>
        <ResetDemoButton />
      </div>
    </>
  );
}
