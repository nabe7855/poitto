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

/** base64 を Blob に変換 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}
