import type { MetadataRoute } from "next";
import { legalDocs } from "@/content/legal";
import { seoPages } from "@/content/seo-pages";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();
  const paths = [
    "/",
    "/services/",
    "/pricing/",
    "/for-students/",
    "/help/",
    "/contact/",
    ...seoPages.map((p) => `/${p.slug}/`),
    ...legalDocs.map((d) => `/legal/${d.slug}/`),
  ];
  return paths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: p === "/" ? 1 : p.startsWith("/legal") ? 0.3 : 0.7,
  }));
}
