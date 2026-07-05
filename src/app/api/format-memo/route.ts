import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 音声メモ等の自由文を、証憑メモとして読みやすく整形する（Gemini）。
 * GEMINI_API_KEY が無い場合や失敗時は、元の文をそのまま返す（安全側）。
 */
export async function POST(req: Request) {
  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return NextResponse.json({ memo: "" });
  }
  if (!text) return NextResponse.json({ memo: "" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ memo: text });

  const model = process.env.GEMINI_MODEL_LITE || "gemini-2.5-flash-lite";
  const prompt = `次の音声メモを、経費・証憑の説明メモとして簡潔で読みやすい日本語に整えてください。
- 可能なら「目的・相手・場所・日付」を拾って、自然な一文〜数行にまとめる
- 不明な項目は書かない。事実を創作しない。元の意味は変えない
- 前置きや解説・見出し記号は付けず、整えた本文のみを返す

音声メモ:
${text}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    if (!res.ok) return NextResponse.json({ memo: text });
    const json = await res.json();
    const out: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({ memo: (out ?? "").trim() || text });
  } catch {
    return NextResponse.json({ memo: text });
  }
}
