"use client";

import { useEffect, useState } from "react";
import {
  IconX,
  IconDownload,
  IconLoader2,
  IconAlertTriangle,
} from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import { useDocuments } from "@/lib/store/documents-store";
import { displayName } from "@/lib/format";
import { downloadBlob } from "@/lib/download";

/**
 * 原本をダウンロードせずに全画面プレビューするビューア。
 * PDFはiframe、画像は<img>で表示。原本の取得はストア経由
 * （デモ=当セッション、本番=S3署名URL）。
 */
export function DocumentPreview({
  doc,
  onClose,
}: {
  doc: DocumentRecord;
  onClose: () => void;
}) {
  const { getOriginalBlob } = useDocuments();
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let objUrl: string | null = null;
    let cancelled = false;
    (async () => {
      const b = await getOriginalBlob(doc.id);
      if (cancelled) return;
      if (!b) {
        setState("error");
        return;
      }
      objUrl = URL.createObjectURL(b);
      setBlob(b);
      setUrl(objUrl);
      setState("ready");
    })();
    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [doc.id, getOriginalBlob]);

  // Escで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isPdf = (doc.mimeType || "").includes("pdf");
  const name = displayName(doc);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/85">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <p className="min-w-0 flex-1 truncate font-mono text-sm text-white/90">
          {name}
        </p>
        {state === "ready" && blob && (
          <button
            type="button"
            onClick={() => downloadBlob(blob, doc.fileName ?? `${doc.id}.pdf`)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            <IconDownload size={14} stroke={2} />
            ダウンロード
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
        >
          <IconX size={20} stroke={1.75} />
        </button>
      </div>

      {/* 本文 */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4">
        {state === "loading" && (
          <p className="flex items-center gap-2 text-sm text-white/70">
            <IconLoader2 size={18} className="animate-spin" />
            原本を読み込んでいます…
          </p>
        )}

        {state === "error" && (
          <div className="max-w-xs text-center">
            <IconAlertTriangle
              size={28}
              stroke={1.75}
              className="mx-auto text-amber"
            />
            <p className="mt-2 text-sm text-white/80">
              原本を表示できませんでした。
            </p>
            <p className="mt-1 text-xs text-white/50">
              保存直後は少し待って再度お試しください。
            </p>
          </div>
        )}

        {state === "ready" && url && (
          isPdf ? (
            <iframe
              src={url}
              title={name}
              className="h-full w-full rounded-lg bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={name}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          )
        )}
      </div>
    </div>
  );
}
