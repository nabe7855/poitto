import { NextResponse } from "next/server";
import { getExtractor } from "@/lib/extractor";
import type { ExtractionInput } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  fileName?: string;
  mimeType?: string;
  data?: string; // base64（原本本体。省略時はモックがファイル名で推定）
  nativeText?: string;
};

/**
 * 証憑の抽出エンドポイント（サーバー専用）。
 * GEMINI_API_KEY があれば Gemini、なければモックで抽出。
 * APIキーはサーバー側のみで参照し、クライアントに露出しない。
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const fileName = body.fileName?.trim();
  if (!fileName) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }

  const input: ExtractionInput = {
    fileName,
    mimeType: body.mimeType || "application/pdf",
    data: body.data ?? "",
    nativeText: body.nativeText,
  };

  try {
    const result = await getExtractor().extract(input);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "extraction failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
