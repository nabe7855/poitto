"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useDocuments } from "@/lib/store/documents-store";

const ACTION_LABEL: Record<string, string> = {
  create: "投函",
  extract: "抽出",
  confirm: "確定",
  update: "修正",
  export: "出力",
  delete: "削除",
};

export function AuditLogList() {
  const { auditLogs, documents } = useDocuments();
  const recent = auditLogs.slice(0, 12);

  return (
    <div className="space-y-2">
      {recent.map((log) => {
        const doc = log.documentId
          ? documents.find((d) => d.id === log.documentId)
          : undefined;
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
                {log.detail && <span className="text-ink/45"> ・ {log.detail}</span>}
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
