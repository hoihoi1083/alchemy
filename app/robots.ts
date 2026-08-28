import type { MetadataRoute } from "next";
import { productSiteUrl } from "@/lib/brand";

export default function robots(): MetadataRoute.Robots {
  const base = productSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/how", "/pricing", "/privacy", "/terms", "/refund", "/sign-in", "/sign-up"],
        disallow: [
          "/api/",
          "/studio",
          "/ultra",
          "/library",
          "/account",
          "/captions",
          "/edit-image",
          "/start",
          "/ugc",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
