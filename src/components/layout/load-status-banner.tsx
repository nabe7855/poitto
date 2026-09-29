"use client";

import { IconLoader2, IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useDocuments } from "@/lib/store/documents-store";

/**
 * 一覧の読み込み状態を知らせる帯。
 * 読み込み失敗を「0件」と誤解させないため、読み込み中・失敗をはっきり表示する。
 */
export function LoadStatusBanner() {
  const { loadState, reloadDocuments } = useDocuments();

  if (loadState === "loading") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-ink/70">
        <IconLoader2 size={18} className="shrink-0 animate-spin text-coral" />
        データを読み込んでいます…（しばらく使われていなかった場合、数十秒かかることがあります）
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-coral/30 bg-coral-50 px-4 py-3 text-sm">
        <IconAlertTriangle size={18} className="shrink-0 text-coral" />
        <span className="flex-1 font-medium text-ink/80">
          データを読み込めませんでした。保存したデータは消えていません。
        </span>
        <button
          type="button"
          onClick={() => reloadDocuments()}
          className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-coral-600"
        >
          <IconRefresh size={14} stroke={2} />
          再読み込み
        </button>
      </div>
    );
  }

  return null;
}
