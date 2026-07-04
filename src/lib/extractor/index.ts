import "server-only";
import type { Extractor } from "./extractor";
import { MockExtractor } from "./mock-extractor";
import { GeminiExtractor } from "./gemini-extractor";

export type { Extractor } from "./extractor";
export type { ExtractionInput, ExtractionResult } from "@/lib/types";

let instance: Extractor | null = null;

/**
 * 設定に応じた抽出器を返すファクトリ（サーバー専用）。
 * - GEMINI_API_KEY があれば GeminiExtractor
 * - なければ MockExtractor（オフライン/デモでも動く）
 * - POITTO_EXTRACTOR=mock で強制的にモック
 */
export function getExtractor(): Extractor {
  if (instance) return instance;

  const forced = process.env.POITTO_EXTRACTOR;
  const apiKey = process.env.GEMINI_API_KEY;

  if (forced !== "mock" && apiKey) {
    instance = new GeminiExtractor({
      apiKey,
      liteModel: process.env.GEMINI_MODEL_LITE,
      proModel: process.env.GEMINI_MODEL_PRO,
    });
  } else {
    instance = new MockExtractor();
  }
  return instance;
}

/** 現在有効な抽出器の種類（画面表示用） */
export function activeExtractorName(): "gemini" | "mock" {
  const forced = process.env.POITTO_EXTRACTOR;
  return forced !== "mock" && process.env.GEMINI_API_KEY ? "gemini" : "mock";
}
