"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconClock,
  IconCircleCheck,
  IconCalendarPlus,
  IconCalendarQuestion,
  IconBuildingBank,
  IconArrowBackUp,
} from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import {
  bucketOf,
  dueRelative,
  effectivePayment,
  endOfMonthIso,
  formatDueShort,
  googleCalendarUrl,
  icsFor,
  METHOD_LABEL,
} from "@/lib/payments";
import { downloadBlob } from "@/lib/download";

/** 支払いの状態を表す小さなラベル（色だけに頼らず、アイコンと文字を必ず添える） */
export function PaymentChip({
  doc,
  size = "md",
}: {
  doc: DocumentRecord;
  size?: "sm" | "md";
}) {
  const eff = effectivePayment(doc);
  const bucket = bucketOf(doc);
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";
  const base = `inline-flex shrink-0 items-center gap-1 rounded-md font-medium ${pad}`;

  if (eff === "paid" || eff === "auto_paid") {
    return (
      <span className={`${base} bg-mint-50 text-mint`}>
        <IconCircleCheck size={12} stroke={2} />
        {eff === "auto_paid"
          ? "引落済み"
          : `支払済み${doc.paidAt ? ` ${formatDueShort(doc.paidAt).replace(/（.）/, "")}` : ""}`}
      </span>
    );
  }
  if (eff === "unknown") {
    return <span className={`${base} bg-black/[0.05] text-ink/55`}>支払い未確認</span>;
  }
  if (eff !== "unpaid" || !bucket) return null;

  if (bucket === "auto") {
    return (
      <span className={`${base} bg-black/[0.05] text-ink/70`}>
        <IconBuildingBank size={12} stroke={2} />
        {METHOD_LABEL[doc.paymentMethod ?? "debit"]}
        {doc.dueDate ? ` ${formatDueShort(doc.dueDate)} 引落予定` : " 引落予定"}
      </span>
    );
  }
  if (bucket === "nodate") {
    return (
      <span className={`${base} border border-dashed border-ink/25 text-ink/60`}>
        <IconCalendarQuestion size={12} stroke={2} />
        未払い・期日未設定
      </span>
    );
  }
  const tone =
    bucket === "overdue"
      ? "bg-coral text-white"
      : bucket === "soon"
        ? "bg-amber-50 text-amber"
        : "bg-black/[0.05] text-ink/70";
  return (
    <span className={`${base} ${tone}`}>
      <IconClock size={12} stroke={2} />
      {formatDueShort(doc.dueDate)} {dueRelative(doc.dueDate)}
    </span>
  );
}

/** 期日をカレンダーに登録（Google／iPhone・Outlook）。アプリを開かなくても気づけるように */
export function CalendarButtons({ doc }: { doc: DocumentRecord }) {
  const url = googleCalendarUrl(doc);
  if (!url) return null;
  const cls =
    "inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:bg-black/[0.03]";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>
        <IconCalendarPlus size={14} stroke={1.75} />
        Googleカレンダーに追加
      </a>
      <button
        type="button"
        className={cls}
        onClick={() => {
          const ics = icsFor(doc);
          if (!ics) return;
          downloadBlob(
            new Blob([ics], { type: "text/calendar;charset=utf-8" }),
            `支払期日_${doc.partnerName ?? "請求書"}_${doc.dueDate}.ics`,
          );
        }}
      >
        <IconCalendarPlus size={14} stroke={1.75} />
        iPhone・Outlookに追加
      </button>
    </div>
  );
}

/** 期日をワンタップで設定（今月末／来月末／日付指定） */
export function DueDateSetter({
  value,
  onSet,
  disabled,
}: {
  value: string | null | undefined;
  onSet: (iso: string | null) => void;
  disabled?: boolean;
}) {
  const chip =
    "rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-ink/70 transition-colors hover:bg-black/[0.03] disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" disabled={disabled} className={chip} onClick={() => onSet(endOfMonthIso(new Date(), 0))}>
        今月末
      </button>
      <button type="button" disabled={disabled} className={chip} onClick={() => onSet(endOfMonthIso(new Date(), 1))}>
        来月末
      </button>
      <input
        type="date"
        aria-label="支払期日"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onSet(e.target.value || null)}
        className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
      />
    </div>
  );
}

/** 「元に戻す」付きのお知らせ。確認ダイアログの代わりに、操作後に取り消せるようにする */
export function useUndoToast() {
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, undo?: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, undo });
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const node = toast ? (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6"
    >
      <div className="flex max-w-md items-center gap-3 rounded-full bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
        <span className="min-w-0 flex-1">{toast.message}</span>
        {toast.undo && (
          <button
            type="button"
            onClick={() => {
              toast.undo?.();
              setToast(null);
            }}
            className="inline-flex shrink-0 items-center gap-1 font-bold text-amber hover:underline"
          >
            <IconArrowBackUp size={15} stroke={2} />
            元に戻す
          </button>
        )}
      </div>
    </div>
  ) : null;

  return { show, node };
}
