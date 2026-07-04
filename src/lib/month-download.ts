import type { DocumentRecord } from "./types";
import { monthLabel } from "./format";
import { documentsToCsv, csvWithBom } from "./csv";
import { downloadBlob } from "./download";

/**
 * 指定月の証憑を1つのZIPにまとめてダウンロードする。
 * - 索引CSV（命名規則どおりのファイル名一覧）を必ず同梱
 * - 原本は命名規則どおりのファイル名で同梱（本番=S3から取得、デモ=当セッション投函分）
 */
export async function downloadMonthZip(
  ym: string,
  docs: DocumentRecord[],
  getOriginalBlob: (id: string) => Promise<Blob | null>,
): Promise<{ total: number; included: number }> {
  const { default: JSZip } = await import("jszip");
  const label = monthLabel(ym); // 例: 2026年06月
  const zip = new JSZip();
  const folder = zip.folder(label)!;

  // 索引CSV
  folder.file(`${label}_索引.csv`, csvWithBom(documentsToCsv(docs)));

  // 原本（命名規則どおりのファイル名で同梱）
  let included = 0;
  for (const d of docs) {
    if (!d.fileName) continue;
    const blob = await getOriginalBlob(d.id).catch(() => null);
    if (blob) {
      folder.file(d.fileName, blob);
      included += 1;
    }
  }

  folder.file(
    "README.txt",
    [
      `${label} の証憑一覧です。`,
      `対象 ${docs.length} 件のうち、原本ファイルを ${included} 件同梱しています。`,
      "",
      "命名規則: 取引年月日_取引先名_税込金額_書類の種類",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${label}.zip`);
  return { total: docs.length, included };
}
