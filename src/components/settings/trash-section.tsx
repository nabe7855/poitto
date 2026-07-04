"use client";

import { useEffect, useState } from "react";
import { IconTrash, IconRestore } from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import { displayName, formatDateJp, formatYen } from "@/lib/format";
import { useDocuments } from "@/lib/store/documents-store";

/** ゴミ箱（削除済み証憑）。復元可能。電帳法の削除履歴のため原本は保持。 */
export function TrashSection() {
  const { getTrash, restoreDocument } = useDocuments();
  const [items, setItems] = useState<DocumentRecord[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    // マウント時にゴミ箱を取得
    let alive = true;
    getTrash().then((t) => {
      if (alive) setItems(t);
    });
    return () => {
      alive = false;
    };
  }, [getTrash]);

  async function onRestore(id: string) {
    setBusyId(id);
    try {
      await restoreDocument(id);
      setItems((prev) => (prev ? prev.filter((d) => d.id !== id) : prev));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <IconTrash size={18} stroke={1.75} className="text-ink/50" />
        ゴミ箱
      </h2>
      <p className="mt-1 text-xs text-ink/45">
        削除した証憑はここに移動します。原本は保持され、いつでも復元できます。
      </p>

      <div className="mt-4">
        {items === null ? (
          <p className="text-sm text-ink/40">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/40">ゴミ箱は空です。</p>
        ) : (
          <div className="space-y-2">
            {items.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 border-b border-black/[0.05] pb-2 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-ink/75">
                    {displayName(d)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink/45">
                    {d.partnerName ?? "—"} ・ {formatDateJp(d.transactionDate)} ・{" "}
                    {formatYen(d.amountInclTax)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(d.id)}
                  disabled={busyId === d.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/80 transition-colors hover:bg-black/[0.03] disabled:opacity-50"
                >
                  <IconRestore size={14} stroke={1.75} />
                  {busyId === d.id ? "復元中…" : "復元"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
