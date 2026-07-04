"use client";

import { useMemo, useState } from "react";
import {
  IconFileText,
  IconCheck,
  IconAlertTriangle,
  IconMoodCheck,
} from "@tabler/icons-react";
import type { DocType, DocumentRecord, FieldKey } from "@/lib/types";
import { REVIEW_THRESHOLD } from "@/lib/types";
import {
  DOC_TYPE_LABEL,
  buildFileName,
  formatBytes,
  formatConfidence,
} from "@/lib/format";
import { useDocuments } from "@/lib/store/documents-store";
import { reviewQueue } from "@/lib/selectors";
import { VoiceMemoField } from "./voice-memo-field";

type Draft = {
  transactionDate: string;
  partnerName: string;
  amountInclTax: string;
  documentType: DocType;
  registrationNumber: string;
  memo: string;
};

function toDraft(d: DocumentRecord): Draft {
  return {
    transactionDate: d.transactionDate ?? "",
    partnerName: d.partnerName ?? "",
    amountInclTax: d.amountInclTax != null ? String(d.amountInclTax) : "",
    documentType: d.documentType ?? "invoice",
    registrationNumber: d.registrationNumber ?? "",
    memo: d.memo ?? "",
  };
}

export function ReviewClient() {
  const { documents, confirmDocument } = useDocuments();
  const queue = useMemo(() => reviewQueue(documents), [documents]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  // 現在のキューから有効なアクティブID・ドラフトを解決
  const effectiveActiveId =
    activeId && queue.some((d) => d.id === activeId)
      ? activeId
      : (queue[0]?.id ?? null);
  const active = queue.find((d) => d.id === effectiveActiveId) ?? null;

  function draftFor(d: DocumentRecord): Draft {
    return drafts[d.id] ?? toDraft(d);
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-white px-6 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint">
          <IconMoodCheck size={30} stroke={1.75} />
        </span>
        <p className="mt-4 text-base font-bold text-ink">確認待ちはありません</p>
        <p className="mt-1 text-sm text-ink/55">
          すべての証憑が保存済みです。おつかれさまでした。
        </p>
      </div>
    );
  }

  function confirm(id: string, draft: Draft) {
    confirmDocument(id, {
      transactionDate: draft.transactionDate,
      partnerName: draft.partnerName,
      amountInclTax: draft.amountInclTax ? Number(draft.amountInclTax) : 0,
      documentType: draft.documentType,
      registrationNumber: draft.registrationNumber || null,
      memo: draft.memo.trim() || null,
    });
    setActiveId(null); // 次のキュー先頭へ自動で移る
  }

  return (
    <div className="space-y-4">
      {/* キュー選択チップ */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-medium text-amber">
          <IconAlertTriangle size={16} stroke={2} />
          要確認 {queue.length} 件
        </span>
        {queue.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveId(d.id)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              d.id === effectiveActiveId
                ? "bg-coral text-white"
                : "bg-white text-ink/70 ring-1 ring-black/10 hover:bg-black/[0.03]",
            ].join(" ")}
          >
            {i + 1}. {d.partnerName ?? "（不明）"}
          </button>
        ))}
      </div>

      {active && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PreviewPane doc={active} />
          <FormPane
            key={active.id}
            doc={active}
            draft={draftFor(active)}
            onChange={(patch) =>
              setDrafts((prev) => ({
                ...prev,
                [active.id]: { ...(prev[active.id] ?? toDraft(active)), ...patch },
              }))
            }
            onConfirm={() => confirm(active.id, draftFor(active))}
          />
        </div>
      )}
    </div>
  );
}

/** 原本プレビュー（フェーズ2はプレースホルダ） */
function PreviewPane({ doc }: { doc: DocumentRecord }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
      <div className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-xl bg-background-soft text-center">
        <IconFileText size={48} stroke={1.25} className="text-ink/25" />
        <p className="mt-3 text-sm font-medium text-ink/50">原本プレビュー</p>
        <p className="mt-1 text-xs text-ink/35">
          {doc.mimeType} ・ {formatBytes(doc.sizeBytes)}
        </p>
        <p className="mt-4 max-w-[220px] text-xs text-ink/35">
          フェーズ4以降、PDF・画像の原本をここに表示します。
        </p>
      </div>
    </div>
  );
}

/** 抽出項目フォーム（低確信をハイライト） */
function FormPane({
  doc,
  draft,
  onChange,
  onConfirm,
}: {
  doc: DocumentRecord;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onConfirm: () => void;
}) {
  const previewName = useMemo(
    () =>
      buildFileName({
        transactionDate: draft.transactionDate || null,
        partnerName: draft.partnerName || null,
        amountInclTax: draft.amountInclTax ? Number(draft.amountInclTax) : null,
        documentType: draft.documentType,
        mimeType: doc.mimeType,
      }),
    [draft, doc.mimeType],
  );

  const conf = (k: FieldKey) => doc.confidence[k];

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
      <h2 className="text-sm font-bold text-ink">抽出項目</h2>
      <p className="mt-1 text-xs text-ink/50">
        <span className="font-medium text-amber">アンバー</span>{" "}
        は確信度が低い項目です。内容を確認してください。
      </p>

      <div className="mt-4 space-y-4">
        <Field label="取引年月日" confidence={conf("transactionDate")}>
          <input
            type="date"
            value={draft.transactionDate}
            onChange={(e) => onChange({ transactionDate: e.target.value })}
            className={inputCls(conf("transactionDate"))}
          />
        </Field>

        <Field label="取引先" confidence={conf("partnerName")}>
          <input
            type="text"
            value={draft.partnerName}
            onChange={(e) => onChange({ partnerName: e.target.value })}
            className={inputCls(conf("partnerName"))}
          />
        </Field>

        <Field label="税込金額（円）" confidence={conf("amountInclTax")}>
          <input
            type="number"
            inputMode="numeric"
            value={draft.amountInclTax}
            onChange={(e) => onChange({ amountInclTax: e.target.value })}
            className={inputCls(conf("amountInclTax"))}
          />
        </Field>

        <Field label="書類の種類" confidence={conf("documentType")}>
          <select
            value={draft.documentType}
            onChange={(e) =>
              onChange({ documentType: e.target.value as DocType })
            }
            className={inputCls(conf("documentType"))}
          >
            {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="登録番号（適格請求書）"
          confidence={conf("registrationNumber")}
          optional
        >
          <input
            type="text"
            placeholder="T+13桁（任意）"
            value={draft.registrationNumber}
            onChange={(e) => onChange({ registrationNumber: e.target.value })}
            className={inputCls(conf("registrationNumber"))}
          />
        </Field>

        <VoiceMemoField
          value={draft.memo}
          onChange={(memo) => onChange({ memo })}
        />
      </div>

      {/* 生成されるファイル名プレビュー */}
      <div className="mt-5 rounded-xl bg-background-soft p-3">
        <p className="text-xs text-ink/50">保存されるファイル名</p>
        <p className="mt-1 break-all font-mono text-sm text-ink/85">
          {previewName ?? "（必須項目を入力してください）"}
        </p>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!previewName}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-mint px-5 py-3 text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconCheck size={18} stroke={2.5} />
        確定して保存
      </button>
    </div>
  );
}

function Field({
  label,
  confidence,
  optional,
  children,
}: {
  label: string;
  confidence: number | undefined;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const low = confidence != null && confidence < REVIEW_THRESHOLD;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-ink/70">
          {label}
          {optional && <span className="ml-1 text-ink/40">任意</span>}
        </label>
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
            confidence == null
              ? "text-ink/40"
              : low
                ? "bg-amber-50 text-amber"
                : "bg-mint-50 text-mint"
          }`}
        >
          {low && <IconAlertTriangle size={11} className="mr-0.5" />}
          確信度 {formatConfidence(confidence)}
        </span>
      </div>
      {children}
    </div>
  );
}

function inputCls(confidence: number | undefined): string {
  const low = confidence != null && confidence < REVIEW_THRESHOLD;
  return [
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors",
    low
      ? "border-amber bg-amber-50/40 focus:border-amber focus:ring-2 focus:ring-amber/30"
      : "border-black/15 focus:border-coral focus:ring-2 focus:ring-coral/20",
  ].join(" ");
}
