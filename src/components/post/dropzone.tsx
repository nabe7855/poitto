"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  IconCloudUpload,
  IconCamera,
  IconFileText,
  IconLoader2,
  IconSparkles,
} from "@tabler/icons-react";
import { StatusBadge } from "@/components/ui/badges";
import { formatBytes } from "@/lib/format";
import type { DocStatus } from "@/lib/types";
import { useDocuments } from "@/lib/store/documents-store";

type Item = {
  key: string;
  name: string;
  size: number;
  status: DocStatus;
};

let counter = 0;

/**
 * 投函ボックス。ファイルを投函すると Extractor(モック) が抽出し、
 * 命名・月別保存 or 要確認へ振り分けてストアに反映する。
 */
export function Dropzone() {
  const { processUpload } = useDocuments();
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function submit(meta: { name: string; size: number; type: string }) {
    const key = `local_${counter++}`;
    setItems((prev) => [
      { key, name: meta.name, size: meta.size, status: "extracting" },
      ...prev,
    ]);
    const doc = await processUpload(meta);
    setItems((prev) =>
      prev.map((p) => (p.key === key ? { ...p, status: doc.status } : p)),
    );
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((f) =>
      submit({ name: f.name, size: f.size, type: f.type }),
    );
  }

  function addSample() {
    submit({
      name: "佐川急便_請求書_2026-06.pdf",
      size: 214_500,
      type: "application/pdf",
    });
  }

  return (
    <div className="space-y-6">
      {/* ドロップゾーン */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          dragOver
            ? "border-coral bg-coral-50"
            : "border-black/15 bg-white hover:border-coral/60 hover:bg-coral-50/40",
        ].join(" ")}
      >
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            dragOver ? "bg-coral text-white" : "bg-coral-50 text-coral"
          }`}
        >
          <IconCloudUpload size={32} stroke={1.75} />
        </span>
        <p className="mt-4 text-base font-bold text-ink">ここに証憑を投函</p>
        <p className="mt-1 text-sm text-ink/55">
          ドラッグ＆ドロップ、またはクリックしてファイルを選択
        </p>
        <p className="mt-3 text-xs text-ink/40">
          PDF・JPG・PNG に対応（請求書・領収書など）
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* 補助アクション */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-black/[0.03]"
        >
          <IconCamera size={18} stroke={1.75} />
          カメラで撮影して投函
        </button>
        <button
          type="button"
          onClick={addSample}
          className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral-50 px-4 py-2.5 text-sm font-medium text-coral transition-colors hover:bg-coral-50/70"
        >
          <IconSparkles size={18} stroke={1.75} />
          サンプルを投函（佐川急便）
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* 投函したファイル */}
      {items.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-ink">投函したファイル</h2>
          <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
            {items.map((it) => (
              <div key={it.key} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral">
                  <IconFileText size={18} stroke={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink/85">{it.name}</p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {formatBytes(it.size)}
                  </p>
                </div>
                {it.status === "extracting" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/55">
                    <IconLoader2 size={14} className="animate-spin" />
                    抽出中
                  </span>
                ) : (
                  <StatusBadge status={it.status} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink/45">
            保存済みは{" "}
            <Link href="/months" className="font-medium text-coral hover:underline">
              月別一覧
            </Link>{" "}
            に、要確認は{" "}
            <Link href="/review" className="font-medium text-coral hover:underline">
              確認キュー
            </Link>{" "}
            に振り分けられます。
          </p>
        </div>
      )}
    </div>
  );
}
