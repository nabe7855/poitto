import type { MetadataRoute } from "next";
import { APP_PREFIX, ROUTES } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";

/**
 * 検索エンジンに見せるのは紹介ページ（LP）だけ。
 * アプリ本体と認証画面は、ログインが要る＆索引に価値がないので除外する。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [APP_PREFIX, `${APP_PREFIX}/`, ROUTES.signin, ROUTES.signup, "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
