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
import type { AuditLog, DocType, DocumentRecord } from "@/lib/types";
import { MOCK_DOCUMENTS, MOCK_AUDIT_LOGS } from "@/lib/mock-data";
import { getExtractor } from "@/lib/extractor";
import { applyExtraction, confirmDraft } from "@/lib/flow";

const STORAGE_KEY = "poitto:v1";

type ConfirmDraft = {
  transactionDate: string;
  partnerName: string;
  amountInclTax: number;
  documentType: DocType;
  registrationNumber: string | null;
};

type UploadMeta = { name: string; size: number; type: string };

interface StoreValue {
  documents: DocumentRecord[];
  auditLogs: AuditLog[];
  /** 投函→抽出→（命名・保存 or 要確認）まで通す */
  processUpload: (file: UploadMeta) => Promise<DocumentRecord>;
  /** 確認キューでの確定 */
  confirmDocument: (id: string, draft: ConfirmDraft) => void;
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
      addLog({ documentId: id, action: "create", actor: "あなた", detail: `投函（${file.name}）` });

      // 抽出（アダプタ経由）
      const result = await getExtractor().extract({
        fileName: file.name,
        mimeType: base.mimeType,
        data: "",
      });
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

  const resetDemo = useCallback(() => {
    const s = seed();
    setDocuments(s.documents);
    setAuditLogs(s.auditLogs);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({ documents, auditLogs, processUpload, confirmDocument, resetDemo }),
    [documents, auditLogs, processUpload, confirmDocument, resetDemo],
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
