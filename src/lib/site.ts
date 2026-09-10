/**
 * サイトの公開URL。OGP画像の絶対URL解決、robots.txt、sitemap.xml で使う。
 *
 * 優先順：
 *   1. NEXT_PUBLIC_SITE_URL … 独自ドメインが決まったらこれを設定する
 *   2. Vercelが渡す本番URL   … プレビュー/初期デプロイ用の自動フォールバック
 *   3. ローカル
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
