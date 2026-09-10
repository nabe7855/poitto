// アプリ内URLの一元定義。
//
// 構成：
//   `/`        … 紹介ページ（LP）。誰でも見られる。
//   `/app/*`   … アプリ本体。本番モードではログインが必要。
//   `/signin`, `/signup` … 認証画面。
//
// 直書きの文字列をコード中に散らさないこと。URL構成を変える時はここだけ直す。

/** アプリ本体のURL接頭辞 */
export const APP_PREFIX = "/app";

export const ROUTES = {
  /** 紹介ページ（LP） */
  lp: "/",
  /** アプリのホーム（ダッシュボード） */
  home: APP_PREFIX,
  post: `${APP_PREFIX}/post`,
  review: `${APP_PREFIX}/review`,
  months: `${APP_PREFIX}/months`,
  search: `${APP_PREFIX}/search`,
  settings: `${APP_PREFIX}/settings`,
  signin: "/signin",
  signup: "/signup",
} as const;

/** そのパスがアプリ本体（＝共通シェル＋認証ゲートの対象）かどうか */
export function isAppRoute(pathname: string): boolean {
  return pathname === APP_PREFIX || pathname.startsWith(`${APP_PREFIX}/`);
}
