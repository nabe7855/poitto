import Link from "next/link";
import {
  IconMailbox,
  IconAlertTriangle,
  IconFileCheck,
  IconCoin,
  IconArrowRight,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/page-header";

/** モックのサマリー値（フェーズ3以降で実データに差し替え） */
const SUMMARY = [
  {
    label: "今月の投函",
    value: "12",
    unit: "件",
    icon: IconMailbox,
    tone: "coral",
  },
  {
    label: "要確認",
    value: "2",
    unit: "件",
    icon: IconAlertTriangle,
    tone: "amber",
  },
  {
    label: "保存済み",
    value: "10",
    unit: "件",
    icon: IconFileCheck,
    tone: "mint",
  },
  {
    label: "今月の合計金額",
    value: "182,340",
    unit: "円",
    icon: IconCoin,
    tone: "ink",
  },
] as const;

const toneStyles: Record<string, string> = {
  coral: "bg-coral-50 text-coral",
  amber: "bg-amber-50 text-amber",
  mint: "bg-mint-50 text-mint",
  ink: "bg-black/5 text-ink",
};

export default function HomePage() {
  return (
    <>
      <PageHeader title="ホーム" description="今月の状況をひと目で。" />

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {SUMMARY.map(({ label, value, unit, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 md:p-5"
          >
            <div
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneStyles[tone]}`}
            >
              <Icon size={20} stroke={1.75} />
            </div>
            <p className="mt-3 text-xs text-ink/55">{label}</p>
            <p className="mt-0.5 font-bold text-ink">
              <span className="text-2xl">{value}</span>
              <span className="ml-1 text-sm">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 投函への導線 */}
      <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl bg-coral p-6 text-white md:flex-row md:items-center md:justify-between md:p-7">
        <div>
          <p className="text-lg font-bold">入れるだけで、証憑がかたづく。</p>
          <p className="mt-1 text-sm text-white/85">
            請求書・領収書を投函すると、AIが名前を付けて月別に保存します。
          </p>
        </div>
        <Link
          href="/post"
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-coral transition-transform hover:scale-[1.02]"
        >
          <IconMailbox size={18} stroke={2} />
          投函する
        </Link>
      </div>

      {/* 最近の証憑（モック骨格） */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">最近の証憑</h2>
          <Link
            href="/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-coral hover:underline"
          >
            すべて見る
            <IconArrowRight size={16} stroke={2} />
          </Link>
        </div>
        <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          {[
            "260630_佐川急便株式会社_71610_請求書",
            "260628_アマゾンジャパン合同会社_3980_領収書",
            "260625_株式会社NTTドコモ_8250_請求書",
          ].map((name) => (
            <div key={name} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-mint" />
              <span className="truncate font-mono text-ink/80">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
