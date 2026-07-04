// [COST-DEBUG] AI費用の試算。★本番リリース前に削除する一時機能★
// 価格は概算の目安（変更可）。実際の請求は Google Cloud / AI Studio の請求で確認してください。

/** 為替レート（USD→JPY・調整可） */
export const USD_JPY = 160;

/** モデル別の料金（100万トークンあたりのUSD: 入力 / 出力）。目安値。 */
const PRICE_PER_1M: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.3 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "mock-extractor": { input: 0.1, output: 0.4 }, // モックはFlash-Lite相当で概算
};
const DEFAULT_PRICE = { input: 0.1, output: 0.4 };

/** 推定費用（円）を返す */
export function estimateCostJpy(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICE_PER_1M[model] ?? DEFAULT_PRICE;
  const usd =
    (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  return usd * USD_JPY;
}

/** 円の表示（小数第2位まで、極小は「<0.01」） */
export function formatJpyCost(jpy: number): string {
  if (jpy <= 0) return "¥0";
  if (jpy < 0.01) return "¥0.01未満";
  return `¥${jpy.toFixed(2)}`;
}
