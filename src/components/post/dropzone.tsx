"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconCloudUpload,
  IconCamera,
  IconFileText,
  IconSparkles,
  IconArrowNarrowRight,
} from "@tabler/icons-react";
import { StatusBadge } from "@/components/ui/badges";
import {
  formatBytes,
  displayName,
  docTypeLabel,
  formatYen,
  formatDateJp,
} from "@/lib/format";
import type {
  DocStatus,
  DocumentRecord,
  ExtractionUsage,
} from "@/lib/types";
import { useDocuments } from "@/lib/store/documents-store";
import { formatJpyCost } from "@/lib/ai-cost"; // [COST-DEBUG] ★本番前に削除★

type Item = {
  key: string;
  name: string;
  size: number;
  status: DocStatus;
  usage?: ExtractionUsage; // [COST-DEBUG] ★本番前に削除★
  result?: DocumentRecord; // 抽出・変換の結果（保存済み/要確認の内容表示用）
};

let counter = 0;

/** File を base64 文字列（data URLプレフィックス除去）に変換 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * 投函ボックス。ファイルを投函すると Extractor(モック) が抽出し、
 * 命名・月別保存 or 要確認へ振り分けてストアに反映する。
 */
export function Dropzone() {
  const { processUpload } = useDocuments();
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  // 二重投函チェック用に最新の投函リストを参照（イベントのクロージャ陳腐化を回避）
  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const MAX_INLINE_BYTES = 15 * 1024 * 1024; // 15MB超は本体を送らない

  // [COST-DEBUG] セッション合計（★本番前に削除★）
  const usedItems = items.filter((i) => i.usage);
  const totalCostCount = usedItems.length;
  const totalCost = usedItems.reduce(
    (s, i) => s + (i.usage?.estimatedCostJpy ?? 0),
    0,
  );
  const totalInput = usedItems.reduce(
    (s, i) => s + (i.usage?.inputTokens ?? 0),
    0,
  );
  const totalOutput = usedItems.reduce(
    (s, i) => s + (i.usage?.outputTokens ?? 0),
    0,
  );

  async function submit(meta: {
    name: string;
    size: number;
    type: string;
    data?: string;
  }) {
    const key = `local_${counter++}`;
    setItems((prev) => [
      { key, name: meta.name, size: meta.size, status: "extracting" },
      ...prev,
    ]);
    const doc = await processUpload(meta);
    setItems((prev) =>
      prev.map((p) =>
        p.key === key
          ? { ...p, status: doc.status, usage: doc.usage, result: doc }
          : p,
      ),
    );
  }

  async function handleFile(file: File) {
    let data: string | undefined;
    if (file.size <= MAX_INLINE_BYTES) {
      data = await fileToBase64(file).catch(() => undefined);
    }
    await submit({ name: file.name, size: file.size, type: file.type, data });
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // 同名・同サイズのファイルが既に投函リストにあれば二重投函を防ぐ
    const seen = new Set(itemsRef.current.map((i) => `${i.name}__${i.size}`));
    const fresh: File[] = [];
    const skipped: string[] = [];
    for (const f of Array.from(files)) {
      const k = `${f.name}__${f.size}`;
      if (seen.has(k)) {
        skipped.push(f.name);
        continue;
      }
      seen.add(k);
      fresh.push(f);
    }
    setNotice(
      skipped.length > 0
        ? `「${skipped[0]}」は既に投函済みのため追加しませんでした（二重投函の防止）。`
        : null,
    );
    fresh.forEach((f) => handleFile(f));
  }

  // 同じファイルを続けて選び直しても onChange が発火するよう value をリセット
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    e.target.value = "";
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
          onChange={onPick}
        />
      </div>

      {/* 二重投函の注意 */}
      {notice && (
        <div className="rounded-xl border border-amber/30 bg-amber-50 px-4 py-2.5 text-sm text-ink/70">
          {notice}
        </div>
      )}

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
          onChange={onPick}
        />
      </div>

      {/* 投函したファイル */}
      {items.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-ink">投函したファイル</h2>
          <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
            {items.map((it) => (
              <div key={it.key} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral-50 text-coral">
                    <IconFileText size={18} stroke={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink/60">
                      {it.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/50">
                      {formatBytes(it.size)}
                      {/* [COST-DEBUG] ★本番前に削除★ */}
                      {it.usage && (
                        <span className="ml-2 text-ink/45">
                          AI費用 {formatJpyCost(it.usage.estimatedCostJpy)}（入力
                          {it.usage.inputTokens.toLocaleString()}／出力
                          {it.usage.outputTokens.toLocaleString()}トークン）
                        </span>
                      )}
                    </p>
                  </div>
                  {it.status === "extracting" ? (
                    <ExtractingProgress />
                  ) : (
                    <StatusBadge status={it.status} />
                  )}
                </div>

                {/* 変換後：AIが読み取った内容と正式名称 */}
                {it.result && it.status !== "extracting" && (
                  <ConversionResult result={it.result} />
                )}
              </div>
            ))}
          </div>

          {/* [COST-DEBUG] AI費用の試算（★開発用・本番前に削除★） */}
          {totalCostCount > 0 && (
            <div className="mt-3 rounded-xl border border-amber/30 bg-amber-50 p-3 text-xs text-ink/70">
              <p className="font-bold text-amber">
                🔧 AI費用の試算（開発用・本番では非表示）
              </p>
              <p className="mt-1">
                この画面で抽出した {totalCostCount} 件の合計：
                <span className="font-bold text-ink">
                  {" "}
                  {formatJpyCost(totalCost)}
                </span>{" "}
                ／ 1件あたり平均{" "}
                <span className="font-bold text-ink">
                  {formatJpyCost(totalCost / totalCostCount)}
                </span>
              </p>
              <p className="mt-0.5 text-ink/50">
                入力 {totalInput.toLocaleString()} ／ 出力{" "}
                {totalOutput.toLocaleString()} トークン。
                ※料金は概算です。実額は請求で確認してください。
              </p>
            </div>
          )}
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

/** 変換後の内容を表示。AIが何を読み取り、どんな正式名称にしたかがその場で分かる。 */
function ConversionResult({ result }: { result: DocumentRecord }) {
  const newName = result.fileName ?? displayName(result);
  const stored = result.status === "stored";
  return (
    <div className="mt-2.5 rounded-xl border border-black/[0.06] bg-background-soft p-3 pl-3.5 sm:ml-12">
      {/* 変換後のファイル名 */}
      <div className="flex items-start gap-1.5">
        <IconArrowNarrowRight
          size={16}
          stroke={2}
          className="mt-0.5 shrink-0 text-mint"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-ink/45">
            {stored ? "この名前で保存しました" : "AIの読み取り（要確認）"}
          </p>
          <p className="mt-0.5 break-all font-mono text-[13px] font-bold text-ink">
            {newName}
          </p>
        </div>
      </div>

      {/* 読み取った項目 */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Chip label="取引先" value={result.partnerName ?? "—"} />
        <Chip label="税込" value={formatYen(result.amountInclTax)} />
        <Chip label="日付" value={formatDateJp(result.transactionDate)} />
        <Chip label="種別" value={docTypeLabel(result.documentType)} />
        {result.registrationNumber && (
          <Chip label="登録番号" value={result.registrationNumber} />
        )}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] ring-1 ring-black/[0.06]">
      <span className="text-ink/40">{label}</span>
      <span className="font-medium text-ink/80">{value}</span>
    </span>
  );
}

/** AI抽出中の進捗ゲージ。完了時間は不定なので途中(〜92%)までスーッと溜めて待つ。 */
function ExtractingProgress() {
  const [pct, setPct] = useState(8);
  useEffect(() => {
    const id = setInterval(() => {
      setPct((v) => {
        if (v >= 92) return v; // 抽出完了まで手前で待機
        const step = v < 55 ? 5 : v < 78 ? 2.5 : 0.8; // 進むほどゆっくり
        return Math.min(92, v + step);
      });
    }, 350);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-24 shrink-0 sm:w-28">
      <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-coral">
        <span className="inline-flex items-center gap-1">
          <IconSparkles size={12} stroke={2} />
          AI変換中
        </span>
        <span className="tabular-nums">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-coral-50">
        <div
          className="h-full rounded-full bg-coral transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
