import type { Extractor } from "./extractor";
import { MockExtractor } from "./mock-extractor";

export type { Extractor } from "./extractor";
export type { ExtractionInput, ExtractionResult } from "@/lib/types";

let instance: Extractor | null = null;

/**
 * 設定に応じた抽出器を返すファクトリ。
 * フェーズ4で GEMINI_API_KEY があれば GeminiExtractor を返すよう分岐する。
 */
export function getExtractor(): Extractor {
  if (!instance) {
    instance = new MockExtractor();
  }
  return instance;
}
