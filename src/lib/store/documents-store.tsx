"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AuditLog,
  DocType,
  DocumentRecord,
  ExtractionResult,
} from "@/lib/types";
import { MOCK_DOCUMENTS, MOCK_AUDIT_LOGS } from "@/lib/mock-data";
import { applyExtraction, confirmDraft } from "@/lib/flow";
import { buildFileName, monthKey, storedPathOf } from "@/lib/format";
import { base64ToBlob } from "@/lib/download";
import { useAuth } from "@/lib/auth/auth-context";
import { isRealMode } from "@/lib/auth/config";
import {
  apiCreateDocument,
  apiDeleteDocument,
  apiGetDocument,
  apiListDocuments,
  apiPatchDocument,
} from "@/lib/api/client";
import { mapApiDoc } from "@/lib/api/map";

const STORAGE_KEY = "poitto:v1";

type ConfirmDraft = {
  transactionDate: string;
  partnerName: string;
  amountInclTax: number;
  documentType: DocType;
  registrationNumber: string | null;
  memo?: string | null;
};

type UploadMeta = {
  name: string;
  size: number;
  type: string;
  data?: string; // 原本本体(base64)
  nativeText?: string;
};

export type SessionFile = { base64: string; mimeType: string };

interface StoreValue {
  documents: DocumentRecord[];
  auditLogs: AuditLog[];
  processUpload: (file: UploadMeta) => Promise<DocumentRecord>;
  confirmDocument: (id: string, draft: ConfirmDraft) => void;
  getSessionFile: (id: string) => SessionFile | undefined;
  /** 原本の実体を取得（デモ=当セッション、本番=S3署名URL経由）。無ければnull */
  getOriginalBlob: (id: string) => Promise<Blob | null>;
  setMemo: (id: string, memo: string) => void;
  deleteDocument: (id: string) => Promise<void>;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

function seed(): { documents: DocumentRecord[]; auditLogs: AuditLog[] } {
  return {
    documents: MOCK_DOCUMENTS.map((d) => ({ ...d })),
    auditLogs: MOCK_AUDIT_LOGS.map((l) => ({ ...l })),
  };
}

// デモ抽出（モックAPIルート経由）
async function requestExtraction(file: UploadMeta): Promise<ExtractionResult> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      data: file.data,
      nativeText: file.nativeText,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `extract failed (${res.status})`);
  }
  const json = (await res.json()) as { result: ExtractionResult };
  return json.result;
}

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const realMode = isRealMode();
  const { status, getIdToken } = useAuth();

  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    realMode ? [] : seed().documents,
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    realMode ? [] : seed().auditLogs,
  );
  const loaded = useRef(false);
  const sessionFiles = useRef<Map<string, SessionFile>>(new Map());
  const docsRef = useRef<DocumentRecord[]>(documents);
  useEffect(() => {
    docsRef.current = documents;
  }, [documents]);

  // ── 本番モード: APIから一覧取得 ──
  const refetch = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const rows = await apiListDocuments(token);
      setDocuments(rows.map(mapApiDoc));
    } catch {
      /* 取得失敗は無視（次のポーリング/操作で再取得） */
    }
  }, [getIdToken]);

  // ── 読み込み ──
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (realMode) {
      if (status === "authed") refetch();
      return;
    }
    // デモ: localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.documents) setDocuments(parsed.documents);
        if (parsed?.auditLogs) setAuditLogs(parsed.auditLogs);
      }
    } catch {
      /* 破損時はシードのまま */
    }
    loaded.current = true;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [realMode, status, refetch]);

  // ── デモ: localStorageへ保存 ──
  useEffect(() => {
    if (realMode || !loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents, auditLogs }));
    } catch {
      /* 無視 */
    }
  }, [documents, auditLogs, realMode]);

  const addLog = useCallback((log: Omit<AuditLog, "id" | "createdAt">) => {
    setAuditLogs((prev) => [
      { ...log, id: newId("log"), createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const stashFile = useCallback((id: string, file: UploadMeta) => {
    if (file.data) {
      sessionFiles.current.set(id, {
        base64: file.data,
        mimeType: file.type || "application/pdf",
      });
    }
  }, []);

  const processUpload = useCallback(
    async (file: UploadMeta): Promise<DocumentRecord> => {
      if (realMode) {
        const token = await getIdToken();
        if (!token) throw new Error("ログインが必要です");
        const { id, uploadUrl } = await apiCreateDocument(token, {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          sizeBytes: file.size || 0,
        });
        stashFile(id, file);
        if (file.data) {
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "content-type": file.type || "application/pdf" },
            body: base64ToBlob(file.data, file.type || "application/pdf"),
          });
        }
        await refetch();
        // S3→SQS→Lambda(Gemini)の非同期抽出をポーリング
        for (let i = 0; i < 12; i++) {
          await sleep(3000);
          await refetch();
          const d = docsRef.current.find((x) => x.id === id);
          if (d && d.status !== "extracting") return d;
        }
        return (
          docsRef.current.find((x) => x.id === id) ?? {
            id,
            status: "extracting",
            transactionDate: null,
            partnerName: null,
            amountInclTax: null,
            documentType: null,
            registrationNumber: null,
            confidence: {},
            overallConfidence: 0,
            model: "",
            fileName: null,
            storedPath: null,
            memo: null,
            mimeType: file.type || "application/pdf",
            sizeBytes: file.size || 0,
            uploadedAt: new Date().toISOString(),
            confirmedAt: null,
          }
        );
      }

      // ── デモモード ──
      const id = newId("doc");
      const base: DocumentRecord = {
        id,
        status: "extracting",
        transactionDate: null,
        partnerName: null,
        amountInclTax: null,
        documentType: null,
        registrationNumber: null,
        confidence: {},
        overallConfidence: 0,
        model: "",
        fileName: null,
        storedPath: null,
        memo: null,
        mimeType: file.type || "application/pdf",
        sizeBytes: file.size || 0,
        uploadedAt: new Date().toISOString(),
        confirmedAt: null,
      };
      setDocuments((prev) => [base, ...prev]);
      stashFile(id, file);
      addLog({ documentId: id, action: "create", actor: "あなた", detail: `投函（${file.name}）` });
      try {
        const result = await requestExtraction(file);
        const updated = applyExtraction(base, result);
        setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
        addLog({
          documentId: id,
          action: "extract",
          actor: "system",
          detail: `抽出完了（確信度 ${Math.round(result.overallConfidence * 100)}%）→ ${
            updated.status === "stored" ? "保存済み" : "要確認"
          }`,
        });
        return updated;
      } catch (err) {
        const errored: DocumentRecord = { ...base, status: "error" };
        setDocuments((prev) => prev.map((d) => (d.id === id ? errored : d)));
        addLog({
          documentId: id,
          action: "extract",
          actor: "system",
          detail: `抽出に失敗しました（${err instanceof Error ? err.message : "unknown"}）`,
        });
        return errored;
      }
    },
    [realMode, getIdToken, refetch, stashFile, addLog],
  );

  const confirmDocument = useCallback(
    (id: string, draft: ConfirmDraft) => {
      if (realMode) {
        (async () => {
          const token = await getIdToken();
          if (!token) return;
          const d = docsRef.current.find((x) => x.id === id);
          const mimeType = d?.mimeType ?? "application/pdf";
          const fileName = buildFileName({ ...draft, mimeType });
          const ym = monthKey(draft.transactionDate);
          await apiPatchDocument(token, id, {
            transactionDate: draft.transactionDate,
            partnerName: draft.partnerName,
            amountInclTax: draft.amountInclTax,
            documentType: draft.documentType,
            registrationNumber: draft.registrationNumber,
            memo: draft.memo ?? null,
            fileName,
            storedPath: ym ? storedPathOf(ym) : null,
          });
          await refetch();
        })();
        return;
      }
      const at = new Date().toISOString();
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? confirmDraft(d, draft, at) : d)),
      );
      addLog({ documentId: id, action: "confirm", actor: "あなた", detail: "確認して保存済みへ確定" });
    },
    [realMode, getIdToken, refetch, addLog],
  );

  const setMemo = useCallback(
    (id: string, memo: string) => {
      if (realMode) {
        (async () => {
          const token = await getIdToken();
          if (!token) return;
          const d = docsRef.current.find((x) => x.id === id);
          if (!d) return;
          const ym = monthKey(d.transactionDate);
          await apiPatchDocument(token, id, {
            transactionDate: d.transactionDate,
            partnerName: d.partnerName,
            amountInclTax: d.amountInclTax,
            documentType: d.documentType,
            registrationNumber: d.registrationNumber,
            memo,
            fileName: d.fileName,
            storedPath: d.storedPath ?? (ym ? storedPathOf(ym) : null),
          });
          await refetch();
        })();
        return;
      }
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, memo } : d)));
      addLog({ documentId: id, action: "update", actor: "あなた", detail: "メモを更新" });
    },
    [realMode, getIdToken, refetch, addLog],
  );

  const getSessionFile = useCallback(
    (id: string): SessionFile | undefined => sessionFiles.current.get(id),
    [],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      sessionFiles.current.delete(id);
      if (realMode) {
        const token = await getIdToken();
        if (!token) return;
        await apiDeleteDocument(token, id);
        await refetch();
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      addLog({ documentId: null, action: "delete", actor: "あなた", detail: "証憑を削除" });
    },
    [realMode, getIdToken, refetch, addLog],
  );

  const getOriginalBlob = useCallback(
    async (id: string): Promise<Blob | null> => {
      // 当セッションで投函した原本があればそれを使う
      const sf = sessionFiles.current.get(id);
      if (sf) return base64ToBlob(sf.base64, sf.mimeType);
      if (!realMode) return null;
      // 本番: 署名付きURLをAPIから取得してS3から取得
      try {
        const token = await getIdToken();
        if (!token) return null;
        const { document } = await apiGetDocument(token, id);
        const url = document?.previewUrl;
        if (!url) return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.blob();
      } catch {
        return null;
      }
    },
    [realMode, getIdToken],
  );

  const resetDemo = useCallback(() => {
    if (realMode) return;
    const s = seed();
    setDocuments(s.documents);
    setAuditLogs(s.auditLogs);
    sessionFiles.current.clear();
  }, [realMode]);

  const value = useMemo<StoreValue>(
    () => ({
      documents,
      auditLogs,
      processUpload,
      confirmDocument,
      getSessionFile,
      getOriginalBlob,
      setMemo,
      deleteDocument,
      resetDemo,
    }),
    [documents, auditLogs, processUpload, confirmDocument, getSessionFile, getOriginalBlob, setMemo, deleteDocument, resetDemo],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDocuments(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useDocuments must be used within DocumentsProvider");
  }
  return ctx;
}
