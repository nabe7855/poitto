import type { NextConfig } from "next";

/**
 * 旧URL（アプリが `/` 直下にあった頃）から新URL（`/app/*`）への転送。
 * ブックマークやホーム画面に追加済みのPWAが 404 にならないようにするため。
 * 恒久リダイレクト(308)はブラウザに強くキャッシュされるので、
 * 構成が固まるまでは一時リダイレクト(307)にしておく。
 */
const LEGACY_APP_PATHS = ["post", "review", "months", "search", "settings"];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // `/lp` は `/` に統合した
      { source: "/lp", destination: "/", permanent: false },
      ...LEGACY_APP_PATHS.map((p) => ({
        source: `/${p}`,
        destination: `/app/${p}`,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
