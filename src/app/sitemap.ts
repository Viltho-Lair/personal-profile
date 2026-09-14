import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/guides";
import { SITE_URL } from "@/lib/site";

/** Pages by how much they matter to search and how often they change. */
const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "monthly" },
  { path: "/slayer-legends-analyzer", priority: 0.9, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const latestGuide = GUIDES.map((guide) => guide.updated).sort().at(-1);
  return [
    ...PAGES.map(({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      priority,
      changeFrequency,
      ...(path === "/guides" && latestGuide ? { lastModified: latestGuide } : {}),
    })),
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: guide.updated,
      priority: 0.7,
      changeFrequency: "monthly" as const,
    })),
  ];
}
