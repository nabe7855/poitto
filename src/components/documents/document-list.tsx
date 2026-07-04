import { IconFileText } from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import {
  displayName,
  formatDateJp,
  formatYen,
} from "@/lib/format";
import { DocTypeBadge, StatusBadge } from "@/components/ui/badges";

/** 証憑の一覧（レスポンシブなリスト行）。一覧・月別・検索結果で共用 */
export function DocumentList({
  documents,
  showStatus = false,
  emptyText = "証憑がありません。",
}: {
  documents: DocumentRecord[];
  showStatus?: boolean;
  emptyText?: string;
}) {
  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-sm text-ink/50">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
      {documents.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.015]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral">
            <IconFileText size={18} stroke={1.75} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm text-ink/85">
              {displayName(d)}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-ink/50">
              <span className="truncate">{d.partnerName ?? "—"}</span>
              <DocTypeBadge type={d.documentType} />
            </p>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-sm font-bold text-ink">
              {formatYen(d.amountInclTax)}
            </p>
            <p className="mt-0.5 text-xs text-ink/50">
              {formatDateJp(d.transactionDate)}
            </p>
          </div>

          {showStatus && (
            <div className="shrink-0">
              <StatusBadge status={d.status} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
