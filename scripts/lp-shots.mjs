// LP（紹介ページ）に載せるアプリ画面のスクリーンショットを撮る。
//
//   npm run build && npx next start -p 3001     （別のターミナルで）
//   SHOTS_BASE_URL=http://localhost:3001 npm run shots
//
// ※ 開発サーバー(next dev)に対して撮ると、Next.jsの開発用インジケーターが
//   画面の隅に写り込む。公開物に載せるので必ず本番ビルドに対して撮ること。
//
// - 撮影対象・サイズを固定しているので、UIを変えたら撮り直すだけで揃う。
// - デモの初期データには実在の企業名が入っているため、撮影用に「架空の取引先」
//   のデータを localStorage へ流し込んでから撮る。公開物に実在企業名を載せない。
// - 出力は public/lp/shot-*.png（幅1600pxに縮小＋PNG圧縮）。

import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.SHOTS_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = "public/lp";
const WIDTH = 1280;
const HEIGHT = 800; // 16:10。LP側のスロット比率と揃えている

/* ---------------------------------------------------------------- 撮影用データ */

const DOC_TYPE_LABEL = {
  invoice: "請求書",
  receipt: "領収書",
  quote: "見積書",
  delivery: "納品書",
  other: "その他",
};

/** 架空の取引先だけで構成した、見栄えのする1か月分 */
const SEEDS = [
  ["2026-06-30", "とちの木文具店", 12_480, "invoice", "T1234567890123", "stored", 0.98, "事務用品（総務）"],
  ["2026-06-28", "みどり運送株式会社", 8_360, "invoice", "T2345678901234", "stored", 0.97, null],
  ["2026-06-26", "さくら印刷株式会社", 64_900, "invoice", "T3456789012345", "stored", 0.96, "こども食堂チラシ 2000部"],
  ["2026-06-24", "街かどカフェ", 3_240, "receipt", null, "stored", 0.95, "地域連携会議の茶菓代（6名）"],
  ["2026-06-21", "あさひ電力", 18_720, "invoice", "T4567890123456", "stored", 0.99, null],
  ["2026-06-19", "ひばり通信サービス", 9_680, "invoice", "T5678901234567", "stored", 0.97, null],
  ["2026-06-17", "大通りタクシー", 2_180, "receipt", null, "review", 0.62, "県庁での打合せ往復"],
  ["2026-06-14", "山あい商会", 41_250, "invoice", null, "review", 0.71, null],
];

function toYymmdd(iso) {
  const [y, m, d] = iso.split("-");
  return `${y.slice(2)}${m}${d}`;
}

function buildSeed() {
  const documents = SEEDS.map(
    ([date, partner, amount, type, reg, status, conf, memo], i) => {
      const stored = status === "stored";
      const [y, m] = date.split("-");
      return {
        id: `doc_shot_${i}`,
        status,
        transactionDate: date,
        partnerName: partner,
        amountInclTax: amount,
        documentType: type,
        registrationNumber: reg,
        confidence: {
          transactionDate: stored ? 0.99 : 0.93,
          partnerName: conf,
          amountInclTax: stored ? 0.98 : 0.74,
          documentType: stored ? 0.99 : 0.9,
          registrationNumber: reg ? 0.94 : 0.4,
        },
        overallConfidence: conf,
        model: "gemini-2.5-flash-lite",
        fileName: stored
          ? `${toYymmdd(date)}_${partner}_${amount}_${DOC_TYPE_LABEL[type]}.pdf`
          : null,
        storedPath: stored ? `保存済み/${y}年${m}月/` : null,
        memo: memo ?? null,
        department: i % 3 === 0 ? "こども食堂事業" : i % 3 === 1 ? "若者相談事業" : null,
        account: null,
        mimeType: "application/pdf",
        sizeBytes: 120_000 + i * 9_000,
        uploadedAt: `${date}T10:${String(10 + i).padStart(2, "0")}:00+09:00`,
        confirmedAt: stored ? `${date}T10:${String(12 + i).padStart(2, "0")}:00+09:00` : null,
      };
    },
  );

  const auditLogs = documents.slice(0, 6).flatMap((d) => [
    { id: `log_${d.id}_c`, documentId: d.id, action: "create", createdAt: d.uploadedAt, detail: null },
    { id: `log_${d.id}_e`, documentId: d.id, action: "extract", createdAt: d.uploadedAt, detail: null },
  ]);

  return { documents, auditLogs };
}

/* ------------------------------------------------------------------ 撮影ターゲット */

const TARGETS = [
  { path: "/app/post", file: "shot-post.png", waitFor: "text=投函" },
  { path: "/app/review", file: "shot-review.png", waitFor: "text=確認キュー" },
  { path: "/app/months", file: "shot-months.png", waitFor: "text=月別一覧" },
  { path: "/app/search", file: "shot-search.png", waitFor: "text=検索" },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2, // 高解像度で撮ってから縮小するとエッジがきれいになる
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    colorScheme: "light",
  });

  const seedJson = JSON.stringify(buildSeed());
  await context.addInitScript((data) => {
    try {
      localStorage.setItem("poitto:v1", data);
    } catch {
      /* 無視 */
    }
  }, seedJson);

  const page = await context.newPage();

  for (const t of TARGETS) {
    await page.goto(`${BASE}${t.path}`, { waitUntil: "networkidle" });
    await page.waitForSelector(t.waitFor, { timeout: 15_000 }).catch(() => {});

    // デモ専用の導線は公開物に写さない（実在企業名を含むサンプル投函ボタンなど）
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("button, a")) {
        if (/サンプルを投函/.test(el.textContent ?? "")) {
          el.style.visibility = "hidden";
        }
      }
    });

    await page.waitForTimeout(700); // 画像・フォントの落ち着き待ち

    const raw = await page.screenshot({ type: "png" });
    const out = `${OUT_DIR}/${t.file}`;
    const buf = await sharp(raw)
      .resize({ width: 1600, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toBuffer();
    await writeFile(out, buf);
    console.log(`${t.path} -> ${out}  ${(buf.length / 1024).toFixed(0)}KB`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
