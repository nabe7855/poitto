"use client";

import { useState } from "react";
import { IconRefresh, IconAlertTriangle } from "@tabler/icons-react";
import { useDocuments } from "@/lib/store/documents-store";
import { formatDateTimeJp } from "@/lib/format";

const ACTION_LABEL: Record<string, string> = {
  create: "投函",
  extract: "抽出",
  confirm: "確定",
  update: "修正",
  export: "出力",
  delete: "削除",
};

/** 抽出に失敗した履歴か */
function isFailure(detail?: string): boolean {
  return !!detail && detail.includes("失敗");
}

export function AuditLogList() {
  const { auditLogs, documents } = useDocuments();
  const [onlyFailures, setOnlyFailures] = useState(false);

  const failureCount = auditLogs.filter((l) => isFailure(l.detail)).length;
  const filtered = onlyFailures
    ? auditLogs.filter((l) => isFailure(l.detail))
    : auditLogs;
  const recent = filtered.slice(0, 50);

  return (
    <div>
      {/* 失敗だけ表示のトグル */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOnlyFailures((v) => !v)}
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            onlyFailures
              ? "bg-coral text-white"
              : "bg-coral-50 text-coral hover:bg-coral-50/70",
          ].join(" ")}
        >
          <IconAlertTriangle size={13} stroke={2} />
          抽出の失敗だけ表示
          {failureCount > 0 && (
            <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[11px]">
              {failureCount}
            </span>
          )}
        </button>
        <span className="text-xs text-ink/40">
          {onlyFailures ? `${filtered.length}件` : `最新${recent.length}件`}
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink/50">
          {onlyFailures ? "抽出の失敗はありません。" : "履歴がありません。"}
        </p>
      ) : (
        <div className="space-y-2">
          {recent.map((log) => {
            const doc = log.documentId
              ? documents.find((d) => d.id === log.documentId)
              : undefined;
            const failed = isFailure(log.detail);
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 border-b border-black/[0.05] pb-2.5 last:border-0"
              >
                <span
                  className={[
                    "mt-0.5 inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium",
                    failed
                      ? "bg-coral text-white"
                      : "bg-black/[0.05] text-ink/70",
                  ].join(" ")}
                >
                  {failed ? "失敗" : ACTION_LABEL[log.action] ?? log.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink/80">
                    {doc?.partnerName ?? "—"}
                    {log.detail && (
                      <span className={failed ? "text-coral" : "text-ink/45"}>
                        {" "}
                        ・ {log.detail}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/40">
                    {log.actor} ・ {formatDateTimeJp(log.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ResetDemoButton() {
  const { resetDemo } = useDocuments();
  return (
    <button
      type="button"
      onClick={() => {
        if (
          window.confirm(
            "投函したデータを消して、デモの初期状態に戻します。よろしいですか？",
          )
        ) {
          resetDemo();
        }
      }}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-black/[0.03]"
    >
      <IconRefresh size={16} stroke={1.75} />
      デモを初期状態に戻す
    </button>
  );
}
