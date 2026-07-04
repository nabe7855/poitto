import type { DocStatus, DocType } from "@/lib/types";
import { docTypeLabel, formatConfidence } from "@/lib/format";
import { REVIEW_THRESHOLD } from "@/lib/types";

const STATUS_STYLE: Record<DocStatus, { label: string; className: string }> = {
  extracting: { label: "抽出中", className: "bg-black/5 text-ink/60" },
  review: { label: "要確認", className: "bg-amber-50 text-amber" },
  stored: { label: "保存済み", className: "bg-mint-50 text-mint" },
  error: { label: "エラー", className: "bg-coral-50 text-coral" },
};

export function StatusBadge({ status }: { status: DocStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.className}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export function DocTypeBadge({ type }: { type: DocType | null }) {
  return (
    <span className="inline-flex items-center rounded-md bg-black/[0.05] px-2 py-0.5 text-xs font-medium text-ink/70">
      {docTypeLabel(type)}
    </span>
  );
}

/** 確信度バッジ。しきい値未満はアンバーで警告色 */
export function ConfidenceBadge({ value }: { value: number | undefined }) {
  if (value == null) return <span className="text-xs text-ink/40">—</span>;
  const low = value < REVIEW_THRESHOLD;
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
        low ? "bg-amber-50 text-amber" : "bg-mint-50 text-mint"
      }`}
    >
      {formatConfidence(value)}
    </span>
  );
}
