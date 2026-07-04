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

const STORAGE_KEY = "poitto:v1";

type ConfirmDraft = {
  transactionDate: string;
  partnerName: string;
  amountInclTax: number;
  documentType: DocType;
  registrationNumber: string | null;
};

type UploadMeta = {
  name: string;
  size: number;
  type: string;
  /** 原本本体(base64)。あればサーバーで実抽出（Gemini）に渡す */
  data?: string;
  nativeText?: string;
};

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

/** セッション中に投函した原本のバイト（base64）。永続化はしない（localStorage肥大回避） */
export type SessionFile = { base64: string; mimeType: string };

interface StoreValue {
  documents: DocumentRecord[];
  auditLogs: AuditLog[];
  /** 投函→抽出→（命名・保存 or 要確認）まで通す */
  processUpload: (file: UploadMeta) => Promise<DocumentRecord>;
  /** 確認キューでの確定 */
  confirmDocument: (id: string, draft: ConfirmDraft) => void;
  /** 当セッションで投函した原本バイト（ZIPダウンロード用。無ければundefined） */
  getSessionFile: (id: string) => SessionFile | undefined;
  /** メモを更新 */
  setMemo: (id: string, memo: string) => void;
  /** デモ初期状態へ戻す */
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

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

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  // SSRとの不一致を避けるため、初期はシード。マウント後にlocalStorageを読む。
  const [documents, setDocuments] = useState<DocumentRecord[]>(
    () => seed().documents,
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => seed().auditLogs);
  const loaded = useRef(false);
  // 当セッションで投函した原本バイト（永続化しない）
  const sessionFiles = useRef<Map<string, SessionFile>>(new Map());

  useEffect(() => {
    // SSRとの不一致を避けるため、マウント後にlocalStorageから読み込む（意図的なsetState）
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        /* eslint-disable react-hooks/set-state-in-effect */
        if (parsed?.documents) setDocuments(parsed.documents);
        if (parsed?.auditLogs) setAuditLogs(parsed.auditLogs);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* 破損時はシードのまま */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ documents, auditLogs }),
      );
    } catch {
      /* 保存失敗は無視 */
    }
  }, [documents, auditLogs]);

  const addLog = useCallback(
    (log: Omit<AuditLog, "id" | "createdAt">) => {
      setAuditLogs((prev) => [
        {
          ...log,
          id: newId("log"),
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const processUpload = useCallback(
    async (file: UploadMeta): Promise<DocumentRecord> => {
      const id = newId("doc");
      const now = new Date().toISOString();
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
        mimeType: file.type || "application/pdf",
        sizeBytes: file.size || 0,
        uploadedAt: now,
        confirmedAt: null,
      };
      setDocuments((prev) => [base, ...prev]);
      // 原本バイトをセッション保持（ZIPダウンロード用）
      if (file.data) {
        sessionFiles.current.set(id, {
          base64: file.data,
          mimeType: file.type || "application/pdf",
        });
      }
      addLog({ documentId: id, action: "create", actor: "あなた", detail: `投函（${file.name}）` });

      // 抽出（サーバーのAPIルート経由。GEMINI_API_KEYがあればGemini、なければモック）
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
    [addLog],
  );

  const confirmDocument = useCallback(
    (id: string, draft: ConfirmDraft) => {
      const at = new Date().toISOString();
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? confirmDraft(d, draft, at) : d)),
      );
      addLog({
        documentId: id,
        action: "confirm",
        actor: "あなた",
        detail: "確認して保存済みへ確定",
      });
    },
    [addLog],
  );

  const setMemo = useCallback((id: string, memo: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, memo } : d)),
    );
    addLog({ documentId: id, action: "update", actor: "あなた", detail: "メモを更新" });
  }, [addLog]);

  const getSessionFile = useCallback(
    (id: string): SessionFile | undefined => sessionFiles.current.get(id),
    [],
  );

  const resetDemo = useCallback(() => {
    const s = seed();
    setDocuments(s.documents);
    setAuditLogs(s.auditLogs);
    sessionFiles.current.clear();
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      documents,
      auditLogs,
      processUpload,
      confirmDocument,
      getSessionFile,
      setMemo,
      resetDemo,
    }),
    [documents, auditLogs, processUpload, confirmDocument, getSessionFile, setMemo, resetDemo],
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
