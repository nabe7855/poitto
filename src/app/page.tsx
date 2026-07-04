import Link from "next/link";
import {
  IconMailbox,
  IconAlertTriangle,
  IconFileCheck,
  IconCoin,
  IconArrowRight,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentList } from "@/components/documents/document-list";
import { formatAmount } from "@/lib/format";
import {
  DEMO_MONTH,
  countByStatus,
  documentsInMonth,
  sumAmount,
} from "@/lib/selectors";
import { MOCK_DOCUMENTS } from "@/lib/mock-data";

export default function HomePage() {
  const monthDocs = documentsInMonth(DEMO_MONTH);
  const reviewCount = countByStatus("review");
  const extractingCount = countByStatus("extracting");
  const monthTotal = sumAmount(monthDocs);
  const recent = [...MOCK_DOCUMENTS]
    .filter((d) => d.status === "stored")
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .slice(0, 4);

  const summary = [
    {
      label: "6月の投函",
      value: String(monthDocs.length + reviewCount + extractingCount),
      unit: "件",
      icon: IconMailbox,
      tone: "coral",
      href: "/months",
    },
    {
      label: "要確認",
      value: String(reviewCount),
      unit: "件",
      icon: IconAlertTriangle,
      tone: "amber",
      href: "/review",
    },
    {
      label: "保存済み（6月）",
      value: String(monthDocs.length),
      unit: "件",
      icon: IconFileCheck,
      tone: "mint",
      href: "/months",
    },
    {
      label: "6月の合計金額",
      value: formatAmount(monthTotal),
      unit: "円",
      icon: IconCoin,
      tone: "ink",
      href: "/search",
    },
  ] as const;

  const toneStyles: Record<string, string> = {
    coral: "bg-coral-50 text-coral",
    amber: "bg-amber-50 text-amber",
    mint: "bg-mint-50 text-mint",
    ink: "bg-black/5 text-ink",
  };

  return (
    <>
      <PageHeader title="ホーム" description="今月の状況をひと目で。" />

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {summary.map(({ label, value, unit, icon: Icon, tone, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 transition-shadow hover:shadow-sm md:p-5"
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
          </Link>
        ))}
      </div>

      {/* 要確認の通知 */}
      {reviewCount > 0 && (
        <Link
          href="/review"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-amber/30 bg-amber-50 px-4 py-3 text-sm transition-colors hover:bg-amber-50/70"
        >
          <IconAlertTriangle size={20} stroke={1.75} className="shrink-0 text-amber" />
          <span className="flex-1 font-medium text-ink/80">
            確認が必要な証憑が {reviewCount} 件あります。
          </span>
          <IconArrowRight size={18} stroke={2} className="text-amber" />
        </Link>
      )}

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

      {/* 最近の証憑 */}
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
        <DocumentList documents={recent} />
      </div>
    </>
  );
}
