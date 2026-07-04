import type { DocumentRecord } from "./types";

/**
 * 重複判定キー：取引年月日・取引先・税込金額・書類種別が全て揃った保存済み証憑のみ対象。
 * （抽出中・要確認・エラーなど、項目が欠けるものは判定しない）
 */
function keyOf(d: DocumentRecord): string | null {
  if (d.status !== "stored") return null;
  if (
    !d.transactionDate ||
    !d.partnerName ||
    d.amountInclTax == null ||
    !d.documentType
  ) {
    return null;
  }
  return `${d.transactionDate}|${d.partnerName}|${d.amountInclTax}|${d.documentType}`;
}

/** 重複の可能性がある証憑ID集合（同一キーが2件以上） */
export function duplicateIdSet(docs: DocumentRecord[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const d of docs) {
    const k = keyOf(d);
    if (!k) continue;
    const arr = groups.get(k) ?? [];
    arr.push(d.id);
    groups.set(k, arr);
  }
  const dup = new Set<string>();
  for (const arr of groups.values()) {
    if (arr.length > 1) arr.forEach((id) => dup.add(id));
  }
  return dup;
}

/** 指定証憑と重複（同一キー）の他の証憑 */
export function duplicatesOf(
  doc: DocumentRecord,
  docs: DocumentRecord[],
): DocumentRecord[] {
  const k = keyOf(doc);
  if (!k) return [];
  return docs.filter((d) => d.id !== doc.id && keyOf(d) === k);
}
