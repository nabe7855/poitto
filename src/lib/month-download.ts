import type { DocumentRecord } from "./types";
import type { SessionFile } from "./store/documents-store";
import { monthLabel } from "./format";
import { documentsToCsv, csvWithBom } from "./csv";
import { downloadBlob } from "./download";

/**
 * 指定月の証憑を1つのZIPにまとめてダウンロードする。
 * - 索引CSV（命名規則どおりのファイル名一覧）を必ず同梱
 * - 当セッションで投函した原本は、命名規則どおりのファイル名で同梱
 * - 原本の実ファイルはS3バックエンド導入後に全件同梱可能になる（それまではREADMEで補足）
 */
export async function downloadMonthZip(
  ym: string,
  docs: DocumentRecord[],
  getSessionFile: (id: string) => SessionFile | undefined,
): Promise<{ total: number; included: number }> {
  const { default: JSZip } = await import("jszip");
  const label = monthLabel(ym); // 例: 2026年06月
  const zip = new JSZip();
  const folder = zip.folder(label)!;

  // 索引CSV
  folder.file(`${label}_索引.csv`, csvWithBom(documentsToCsv(docs)));

  // 原本（当セッション投函分のみ実ファイルを同梱）
  let included = 0;
  for (const d of docs) {
    const file = getSessionFile(d.id);
    if (file && d.fileName) {
      folder.file(d.fileName, file.base64, { base64: true });
      included += 1;
    }
  }

  folder.file(
    "README.txt",
    [
      `${label} の証憑一覧です。`,
      `対象 ${docs.length} 件のうち、原本ファイルを ${included} 件同梱しています。`,
      "",
      "※ 原本の実ファイルは、AWS（S3）バックエンド導入後に全件を同梱できます。",
      "　 それまでは索引CSVと、当セッションで投函した原本のみが含まれます。",
      "",
      "命名規則: 取引年月日_取引先名_税込金額_書類の種類",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${label}.zip`);
  return { total: docs.length, included };
}
