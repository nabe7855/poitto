// SNSシェア用のOGP画像（1200×630）を、既存の素材から組み立てる。
//
//   npm run ogp
//
// AIに文字を描かせると日本語が崩れるので、文字は入れない。
// 代わりに、ロゴ（既存のPNG素材）とヒーローのイラストを合成するだけにする。
// キャッチコピーはOGPのmetaタグ側（title/description）で出るので、画像に焼く必要はない。

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const W = 1200;
const H = 630;
const BG = "#f9f7f4"; // イラスト自身の地色に合わせる（合成の継ぎ目を消すため）

const HERO = "assets/lp/hero.png"; // 生成そのままの16:9（左側が余白）
const LOGO = "public/brand/logo/poitto_logo_horizontal.png";
const OUT = "public/lp/ogp.png";

async function main() {
  // 生成そのままのヒーローは左3分の2が余白。まず右側だけを4:3で切り出し、
  // 高さいっぱいに収めて右寄せする（LPのヒーローと同じ切り出し方）。
  const meta = await sharp(HERO).metadata();
  const cropW = Math.round(meta.height * 4 / 3);
  const hero = await sharp(HERO)
    .extract({ left: meta.width - cropW, top: 0, width: cropW, height: meta.height })
    .resize({ height: H })
    .toBuffer();
  const heroW = Math.round((cropW / meta.height) * H);

  const logoW = 260;
  const logo = await sharp(LOGO).resize({ width: logoW }).toBuffer();
  const logoH = (await sharp(logo).metadata()).height;

  const out = await sharp({
    create: { width: W, height: H, channels: 4, background: BG },
  })
    .composite([
      { input: hero, left: W - heroW, top: 0 },
      { input: logo, left: 72, top: Math.round((H - logoH) / 2) },
    ])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();

  await writeFile(OUT, out);
  console.log(`${OUT}  ${W}x${H}  ${(out.length / 1024).toFixed(0)}KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
