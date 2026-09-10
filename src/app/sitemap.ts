import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** 公開しているのはLPだけなので、いまは1ページ。 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
