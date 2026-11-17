import { API_URL } from "@/lib/auth/config";

/** JWT付きでAPI Gatewayを叩く */
async function apiFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export type ApiRow = Record<string, unknown>;

export async function apiListDocuments(token: string): Promise<ApiRow[]> {
  return (await apiListDocumentsWithFeatures(token)).rows;
}

/** 一覧＋サーバーが対応している機能（支払い管理など）を返す */
export async function apiListDocumentsWithFeatures(
  token: string,
): Promise<{ rows: ApiRow[]; features: { payments: boolean } }> {
  const json = (await apiFetch("/documents", token)) as {
    documents?: ApiRow[];
    features?: { payments?: boolean };
  };
  return {
    rows: json.documents ?? [],
    features: { payments: json.features?.payments === true },
  };
}

/** 支払い状況の一括更新（まとめて消し込み・過去分の整理） */
export async function apiBulkPayments(
  token: string,
  body: {
    ids: string[];
    paymentStatus: string;
    paidAt?: string | null;
    paymentMethod?: string | null;
  },
): Promise<{ ok: boolean; updated: number }> {
  return (await apiFetch("/payments/bulk", token, {
    method: "POST",
    body: JSON.stringify(body),
  })) as { ok: boolean; updated: number };
}

export async function apiCreateDocument(
  token: string,
  body: { fileName: string; mimeType: string; sizeBytes: number },
): Promise<{ id: string; uploadUrl: string; s3Key: string }> {
  return (await apiFetch("/documents", token, {
    method: "POST",
    body: JSON.stringify(body),
  })) as { id: string; uploadUrl: string; s3Key: string };
}

export async function apiGetDocument(
  token: string,
  id: string,
): Promise<{ document: ApiRow & { previewUrl?: string } }> {
  return (await apiFetch(`/documents/${id}`, token)) as {
    document: ApiRow & { previewUrl?: string };
  };
}

export async function apiPatchDocument(
  token: string,
  id: string,
  body: Record<string, unknown>,
): Promise<void> {
  await apiFetch(`/documents/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDeleteDocument(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch(`/documents/${id}`, token, { method: "DELETE" });
}

export async function apiRestoreDocument(
  token: string,
  id: string,
): Promise<void> {
  await apiFetch(`/documents/${id}/restore`, token, { method: "POST" });
}

export async function apiListTrash(token: string): Promise<ApiRow[]> {
  const json = (await apiFetch("/trash", token)) as { documents?: ApiRow[] };
  return json.documents ?? [];
}

export async function apiListAudit(token: string): Promise<ApiRow[]> {
  const json = (await apiFetch("/audit", token)) as { logs?: ApiRow[] };
  return json.logs ?? [];
}
