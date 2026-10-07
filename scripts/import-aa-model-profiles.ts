import { readFile, writeFile, rename } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import { mergeBriefcaseComponents, type BriefcaseComponentsSource } from "../src/lib/aa-briefcase";
import { mergeAaModelProfileOverlays, type AaModelProfileOverlay } from "../src/lib/aa-model-profile-overlays";

type CostSnapshot = {
  source_url: string;
  captured_at: string;
  metric: string;
  metric_path: string;
  model_count: number;
  cost_count: number;
  records: Array<{
    slug: string;
    name: string;
    provider: string;
    cost_usd: number;
    url: string;
    profile_captured_at?: string;
  }>;
  profile_updates?: Array<{ captured_at: string; model_count: number; source_urls: string[] }>;
};

const [datasetText, componentText, costText] = await Promise.all([
  readFile("data/leaderboards.json", "utf8"),
  readFile("data/aa-briefcase-components.json", "utf8"),
  readFile("data/intelligence-index-costs.json", "utf8"),
]);
const profileSource = JSON.parse(await readFile("data/aa-model-profile-overlays.json", "utf8")) as AaModelProfileOverlay;
const dataset = mergeAaModelProfileOverlays(
  mergeBriefcaseComponents(
    JSON.parse(datasetText) as Dataset,
    JSON.parse(componentText) as BriefcaseComponentsSource,
  ),
  profileSource,
);

const costSnapshot = JSON.parse(costText) as CostSnapshot;
const costsBySlug = new Map(costSnapshot.records.map(record => [record.slug, record]));
for (const profile of profileSource.models) {
  const cost = profile.metadata.intelligence_index_cost_per_task_usd;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) {
    throw new Error(`Missing valid Intelligence Index task cost for ${profile.name}`);
  }
  const slug = new URL(profile.profile_url).pathname.split("/").filter(Boolean).at(-1);
  if (!slug) throw new Error(`Could not determine profile slug for ${profile.name}`);
  costsBySlug.set(slug, {
    slug,
    name: profile.name,
    provider: profile.provider,
    cost_usd: cost,
    url: profile.profile_url,
    profile_captured_at: profileSource.captured_at,
  });
}
const profileUpdates = new Map((costSnapshot.profile_updates ?? []).map(update => [update.captured_at, update]));
profileUpdates.set(profileSource.captured_at, {
  captured_at: profileSource.captured_at,
  model_count: profileSource.models.length,
  source_urls: profileSource.models.map(profile => profile.profile_url),
});
const updatedCosts: CostSnapshot = {
  ...costSnapshot,
  cost_count: costsBySlug.size,
  records: [...costsBySlug.values()].sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name)),
  profile_updates: [...profileUpdates.values()].sort((a, b) => a.captured_at.localeCompare(b.captured_at)),
};

await writeFile("data/leaderboards.json.tmp", JSON.stringify(dataset));
await rename("data/leaderboards.json.tmp", "data/leaderboards.json");
await writeFile("data/intelligence-index-costs.json.tmp", `${JSON.stringify(updatedCosts, null, 2)}\n`);
await rename("data/intelligence-index-costs.json.tmp", "data/intelligence-index-costs.json");
console.log(JSON.stringify({
  profiles: profileSource.models.map(profile => profile.name),
  evaluation_count: dataset.evaluations.length,
  row_count: dataset.entries.length,
  profile_entries: dataset.entries.filter(entry => entry.source_asset_id === dataset.sourceAssets?.find(asset => asset.filename === "aa-model-profile-overlays.json")?.id).length,
  task_cost_count: updatedCosts.cost_count,
}, null, 2));
