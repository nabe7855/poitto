/** Blob をファイルとしてダウンロードさせる */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** CSV文字列（BOM付き想定）をダウンロード */
export function downloadCsv(csvWithBom: string, fileName: string): void {
  downloadBlob(
    new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" }),
    fileName,
  );
}
