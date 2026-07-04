import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ポイッと（POITTO）",
    short_name: "ポイッと",
    description: "入れるだけで、証憑がかたづく。",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#e8542b",
    lang: "ja",
    icons: [
      {
        src: "/brand/app-icon/poitto_appicon_256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/app-icon/poitto_appicon_512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
