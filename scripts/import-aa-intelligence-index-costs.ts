import { writeFile } from "node:fs/promises";

const sourceUrl = "https://artificialanalysis.ai/models/gpt-6-1-sol-high";
const response = await fetch(sourceUrl, { headers: { "user-agent": "ai-models-leaderboards/1.0" } });
if (!response.ok) throw new Error(`Artificial Analysis returned ${response.status} for ${sourceUrl}`);
const html = await response.text();

const flightChunks = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g)]
  .map(match => JSON.parse(match[1]) as string);
const flight = flightChunks.join("");
if (!flight) throw new Error("Could not find the Artificial Analysis page data payload");

function parseJsonValue(input: string, start: number): { value: unknown; end: number } {
  while (/\s/.test(input[start] ?? "")) start++;
  const first = input[start];
  if (first !== "{" && first !== "[") throw new Error(`Expected JSON object or array at ${start}`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < input.length; i++) {
    const char = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") depth++;
    else if (char === "}" || char === "]") {
      depth--;
      if (depth === 0) return { value: JSON.parse(input.slice(start, i + 1)), end: i + 1 };
    }
  }
  throw new Error("Artificial Analysis JSON value was incomplete");
}

const currentModelKey = '"currentModel":';
const currentModelStart = flight.indexOf(currentModelKey);
if (currentModelStart < 0) throw new Error("Could not find the current model in the page data");
const currentModel = parseJsonValue(flight, currentModelStart + currentModelKey.length).value as Record<string, unknown>;

const modelsKey = '"models":';
const modelsStart = flight.indexOf(modelsKey, currentModelStart);
if (modelsStart < 0) throw new Error("Could not find the model list in the page data");
const models = parseJsonValue(flight, modelsStart + modelsKey.length).value as Record<string, unknown>[];

const uniqueModels = new Map<string, Record<string, unknown>>();
for (const model of [currentModel, ...models]) {
  const slug = model.slug;
  if (typeof slug !== "string") continue;
  const previous = uniqueModels.get(slug);
  if (!previous || (!previous.intelligenceIndexCostPerTask && model.intelligenceIndexCostPerTask)) uniqueModels.set(slug, model);
}

const records = [...uniqueModels.values()].flatMap(model => {
  const creator = model.creator as Record<string, unknown> | undefined;
  const perTask = model.intelligenceIndexCostPerTask as { cost?: { total?: unknown } } | undefined;
  const cost = perTask?.cost?.total;
  if (typeof model.slug !== "string" || typeof model.name !== "string" || typeof creator?.name !== "string" || typeof cost !== "number" || !Number.isFinite(cost)) return [];
  return [{
    slug: model.slug,
    name: model.name,
    provider: creator.name,
    cost_usd: cost,
    url: `https://artificialanalysis.ai/models/${model.slug}`
  }];
}).sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

if (!records.length) throw new Error("The Artificial Analysis page contained no Intelligence Index task costs");

const snapshot = {
  source_url: sourceUrl,
  captured_at: new Date().toISOString(),
  metric: "Cost per Intelligence Index task",
  metric_path: "intelligenceIndexCostPerTask.cost.total",
  model_count: uniqueModels.size,
  cost_count: records.length,
  records
};
await writeFile("data/intelligence-index-costs.json", `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${records.length} costs from ${uniqueModels.size} Artificial Analysis models to data/intelligence-index-costs.json`);
