import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/llms-text";

// Let AI assistants (Claude, ChatGPT, etc.) and search engines read the public pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/suitability/saved"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
