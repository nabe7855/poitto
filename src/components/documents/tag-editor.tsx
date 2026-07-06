"use client";

import { useMemo, useState } from "react";
import {
  IconTag,
  IconDeviceFloppy,
  IconSparkles,
} from "@tabler/icons-react";
import type { DocumentRecord } from "@/lib/types";
import { useDocuments } from "@/lib/store/documents-store";
import { ACCOUNT_PRESETS, departmentOptions, suggestAccount } from "@/lib/tags";

/**
 * 部門（事業/プロジェクト）と科目（勘定科目）を付けられる開閉式エディタ。
 * - 部門: これまで使った名前をサジェスト（自由入力可）
 * - 科目: よく使う勘定科目のプリセット＋AIの候補（自由入力可）
 */
export function TagEditor({
  doc,
  defaultOpen = false,
}: {
  doc: DocumentRecord;
  defaultOpen?: boolean;
}) {
  const { documents, setTags } = useDocuments();
  const [open, setOpen] = useState(defaultOpen);
  const [dept, setDept] = useState(doc.department ?? "");
  const [acct, setAcct] = useState(doc.account ?? "");
  const [savedDept, setSavedDept] = useState(doc.department ?? "");
  const [savedAcct, setSavedAcct] = useState(doc.account ?? "");
  const [justSaved, setJustSaved] = useState(false);

  const deptList = useMemo(() => departmentOptions(documents), [documents]);
  const suggestion = acct.trim() ? null : suggestAccount(doc);
  const dirty =
    dept.trim() !== savedDept.trim() || acct.trim() !== savedAcct.trim();

  const deptListId = `dept-${doc.id}`;
  const acctListId = `acct-${doc.id}`;

  function save() {
    const d = dept.trim() || null;
    const a = acct.trim() || null;
    setTags(doc.id, { department: d, account: a });
    setSavedDept(d ?? "");
    setSavedAcct(a ?? "");
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  }

  if (!open) {
    const has = savedDept || savedAcct;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 inline-flex max-w-full items-center gap-1 text-xs font-medium text-mint hover:underline"
      >
        <IconTag size={13} stroke={2} className="shrink-0" />
        {has ? "分類を編集" : "部門・科目をつける"}
        {has && (
          <span className="ml-1 truncate font-normal text-ink/55">
            ：{[savedDept, savedAcct].filter(Boolean).join(" / ")}
          </span>
        )}
      </button>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-colors focus:border-mint focus:ring-2 focus:ring-mint/20";

  return (
    <div className="mt-2.5 rounded-xl border border-black/[0.06] bg-white p-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-ink/60">
            部門（事業）<span className="ml-1 text-ink/40">任意</span>
          </label>
          <input
            type="text"
            list={deptListId}
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            placeholder="例：こども食堂事業"
            className={inputCls}
          />
          <datalist id={deptListId}>
            {deptList.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-ink/60">
            科目（勘定科目）<span className="ml-1 text-ink/40">任意</span>
          </label>
          <input
            type="text"
            list={acctListId}
            value={acct}
            onChange={(e) => setAcct(e.target.value)}
            placeholder="例：消耗品費"
            className={inputCls}
          />
          <datalist id={acctListId}>
            {ACCOUNT_PRESETS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
      </div>

      {suggestion && (
        <button
          type="button"
          onClick={() => setAcct(suggestion)}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-medium text-mint transition-colors hover:bg-mint-50/70"
        >
          <IconSparkles size={12} />
          科目の候補：{suggestion} を使う
        </button>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-95 disabled:opacity-40"
        >
          <IconDeviceFloppy size={14} stroke={2} />
          分類を保存
        </button>
        {!defaultOpen && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-ink/50 hover:bg-black/[0.04]"
          >
            閉じる
          </button>
        )}
        {justSaved && (
          <span className="text-xs font-medium text-mint">保存しました</span>
        )}
      </div>
    </div>
  );
}
