// 本番AWS接続の設定（Vercelの環境変数から読む）。
// これらが揃っている時だけ「本番モード（ログイン必須＋実API）」になる。
// 未設定なら従来どおり「デモモード（localStorage・ログイン不要）」で動く。

export const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "ap-northeast-1";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
export const USER_POOL_CLIENT_ID =
  process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";

/** 本番モード（AWS接続あり）かどうか */
export function isRealMode(): boolean {
  return Boolean(API_URL && USER_POOL_ID && USER_POOL_CLIENT_ID);
}

/** 認証不要のルート */
export const AUTH_ROUTES = ["/signin", "/signup"];
