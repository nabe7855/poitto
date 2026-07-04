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
  const json = (await apiFetch("/documents", token)) as { documents?: ApiRow[] };
  return json.documents ?? [];
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
