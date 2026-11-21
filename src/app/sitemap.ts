import type { MetadataRoute } from "next";
import { getEvaluations } from "@/lib/data";
import { siteUrl } from "@/lib/llms-text";
import { workflows } from "@/lib/workflow-registry";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const paths = ["/", "/llms.txt", "/llms-full.txt", "/personality", "/workflows", "/about/data",
    ...(await getEvaluations()).flatMap(e => [`/leaderboards/${e.slug}`, `/llms/leaderboards/${e.slug}`]),
    ...workflows.map(w => `/workflows/${w.slug}`)];
  return paths.map(path => ({ url: `${base}${path}` }));
}
