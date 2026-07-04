import type { ExtractionInput, ExtractionResult } from "@/lib/types";

/**
 * 抽出アダプタ（移植性のための境界）。
 * フェーズ3=モック実装、フェーズ4=GeminiExtractor に差し替え可能にする。
 */
export interface Extractor {
  readonly name: string;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}

export type { ExtractionInput, ExtractionResult };
