import type { MetadataRoute } from "next";
import { productSiteUrl } from "@/lib/brand";

/** Public marketing pages only — app surfaces stay out of the index map. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = productSiteUrl();
  const lastModified = new Date();
  const paths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] =
    [
      { path: "/", priority: 1, changeFrequency: "weekly" },
      { path: "/how", priority: 0.8, changeFrequency: "monthly" },
      { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
      { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
      { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
      { path: "/refund", priority: 0.3, changeFrequency: "yearly" },
      { path: "/sign-in", priority: 0.4, changeFrequency: "yearly" },
      { path: "/sign-up", priority: 0.5, changeFrequency: "yearly" },
    ];

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
