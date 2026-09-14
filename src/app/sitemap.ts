import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/guides";
import { SITE_URL } from "@/lib/site";

const PAGES = ["", "/slayer-legends-analyzer", "/guides", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: guide.updated,
    })),
  ];
}
