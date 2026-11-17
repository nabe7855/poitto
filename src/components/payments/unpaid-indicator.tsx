"use client";

import Link from "next/link";
import { IconAlarm, IconCircleCheck } from "@tabler/icons-react";
import { useDocuments } from "@/lib/store/documents-store";
import { paymentSummary } from "@/lib/payments";
import { ROUTES } from "@/lib/routes";

/**
 * ヘッダーに常に出す「未払い ◯件」。どのページからでも未払いの有無が分かるようにする。
 * 色で緊急度を示す（期限切れ=コーラル枠／7日以内=アンバー枠／それ以外=グレー／なし=ミント）。
 * 押すと支払い画面へ。
 */
export function UnpaidIndicator() {
  const { documents, paymentsEnabled, loadState } = useDocuments();
  // 読み込み前に「0件」と誤表示しない
  if (!paymentsEnabled || loadState !== "ready") return null;

  const s = paymentSummary(documents);
  const unpaid = s.unpaid.length;
  const unknown = s.unknown.length;

  let tone: string;
  let label: string;
  let detail: string; // 読み上げ・ツールチップ用
  if (unpaid > 0) {
    // 期限切れも塗りつぶしにはしない（隣の「投函する」ボタンと紛れない・邪魔にならないように）
    tone =
      s.overdue.length > 0
        ? "bg-coral-50 text-coral ring-1 ring-coral/40 hover:bg-coral-50/70"
        : s.soon.length > 0
          ? "bg-amber-50 text-amber ring-1 ring-amber/30 hover:bg-amber-50/70"
          : "bg-black/[0.05] text-ink/70 hover:bg-black/[0.08]";
    const urgent =
      s.overdue.length > 0
        ? `・期限切れ${s.overdue.length}`
        : s.soon.length > 0
          ? `・7日以内${s.soon.length}`
          : "";
    label = `未払い ${unpaid}件${urgent}`;
    detail =
      `未払いの請求書 ${unpaid}件（期限切れ${s.overdue.length}件・7日以内${s.soon.length}件）` +
      (unknown > 0 ? `。ほかに支払い未確認の請求書が${unknown}件` : "");
  } else if (unknown > 0) {
    tone = "bg-black/[0.05] text-ink/60 hover:bg-black/[0.08]";
    label = `支払い未確認 ${unknown}件`;
    detail = `支払い状況が未確認の請求書が${unknown}件あります`;
  } else {
    tone = "bg-mint-50 text-mint hover:bg-mint-50/70";
    label = "未払いなし";
    detail = "未払いの請求書はありません";
  }

  const Icon = unpaid === 0 && unknown === 0 ? IconCircleCheck : IconAlarm;

  // スマホ幅では既存のヘッダー要素（ロゴ・投函・ログアウト）で一杯なので出さない。
  // 代わりに下部タブの「支払い」に同じ件数・同じ色のバッジを常に出している。
  return (
    <Link
      href={ROUTES.payments}
      title={detail}
      aria-label={`${detail}。支払い画面を開く`}
      className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors sm:inline-flex ${tone}`}
    >
      <Icon size={15} stroke={2} className="shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
