import { createHash, webcrypto } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

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
let models: Record<string, unknown>[];
if (currentModelStart >= 0) {
  const currentModel = parseJsonValue(flight, currentModelStart + currentModelKey.length).value as Record<string, unknown>;
  const modelsKey = '"models":';
  const modelsStart = flight.indexOf(modelsKey, currentModelStart);
  if (modelsStart < 0) throw new Error("Could not find the model list in the page data");
  models = [currentModel, ...parseJsonValue(flight, modelsStart + modelsKey.length).value as Record<string, unknown>[]];
} else {
  // AA now sends only preselected models inline. Its public manifests load the complete model list.
  const manifests = [...flight.matchAll(/"manifest":(\{[^}]+\})/g)]
    .map(match => JSON.parse(match[1]) as { path: string; key?: string });
  models = [];
  for (const manifest of manifests) {
    const dataUrl = new URL(manifest.path, sourceUrl);
    const dataResponse = await fetch(dataUrl);
    if (!dataResponse.ok) throw new Error(`Artificial Analysis returned ${dataResponse.status} for ${dataUrl}`);
    let payload: unknown;
    if (manifest.key) {
      // Match AA's browser loader: AES-GCM, SHA-256(key)'s first 12 bytes as IV, then gzip.
      const key = Buffer.from(manifest.key, "hex");
      const cryptoKey = await webcrypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]);
      const decrypted = await webcrypto.subtle.decrypt({
        name: "AES-GCM",
        iv: createHash("sha256").update(key).digest().subarray(0, 12),
        tagLength: 128,
      }, cryptoKey, await dataResponse.arrayBuffer());
      payload = JSON.parse(gunzipSync(Buffer.from(decrypted)).toString("utf8"));
    } else {
      payload = await dataResponse.json();
    }
    // The other manifest contains hosted endpoints, rather than creator-owned model records.
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const listedModels = (payload as { models?: Record<string, unknown>[] }).models;
      if (Array.isArray(listedModels)) models.push(...listedModels);
    }
  }
  if (!models.length) throw new Error("Could not find the complete model list in the page manifests");
}

const uniqueModels = new Map<string, Record<string, unknown>>();
for (const model of models) {
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

const capturedAt = new Date().toISOString();
const seconds = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const speedRecords = [...uniqueModels.values()].flatMap(model => {
  const creator = model.creator as Record<string, unknown> | undefined;
  if (typeof model.slug !== "string" || typeof model.name !== "string" || typeof creator?.name !== "string") return [];
  const performance = model.performance as { headline?: { timeToFirstAnswerToken?: unknown } } | undefined;
  // Encrypted manifests flatten performance.headline onto each model record.
  const headline = performance?.headline ?? model.headline as { timeToFirstAnswerToken?: unknown } | undefined;
  const evaluations = model.intelligenceIndexEvaluations as Array<{ slug?: unknown; timePerTask?: unknown }> | undefined;
  const timePerTask = seconds(model.intelligenceIndexTimePerTask);
  const firstAnswer = seconds(headline?.timeToFirstAnswerToken);
  const evaluationTimes = Object.fromEntries((evaluations ?? []).flatMap(evaluation => {
    const time = seconds(evaluation.timePerTask);
    return typeof evaluation.slug === "string" && time !== null ? [[evaluation.slug, time]] : [];
  }));
  if (timePerTask === null && firstAnswer === null && !Object.keys(evaluationTimes).length) return [];
  return [{
    slug: model.slug,
    name: model.name,
    provider: creator.name,
    url: `https://artificialanalysis.ai/models/${model.slug}`,
    time_per_task_s: timePerTask,
    first_answer_s: firstAnswer,
    evaluation_times_s: evaluationTimes,
    captured_at: capturedAt,
  }];
}).sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
if (!speedRecords.length) throw new Error("The Artificial Analysis page contained no model speed values");

const snapshot = {
  source_url: sourceUrl,
  captured_at: capturedAt,
  metric: "Cost per Intelligence Index task",
  metric_path: "intelligenceIndexCostPerTask.cost.total",
  model_count: uniqueModels.size,
  cost_count: records.length,
  records
};
await writeFile("data/intelligence-index-costs.json", `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${records.length} costs from ${uniqueModels.size} Artificial Analysis models to data/intelligence-index-costs.json`);
const speedSnapshot = {
  source_url: sourceUrl,
  captured_at: capturedAt,
  model_count: uniqueModels.size,
  speed_count: speedRecords.length,
  time_per_task_count: speedRecords.filter(record => record.time_per_task_s !== null).length,
  first_answer_count: speedRecords.filter(record => record.first_answer_s !== null).length,
  evaluation_time_count: speedRecords.filter(record => Object.keys(record.evaluation_times_s).length).length,
  records: speedRecords,
};
await writeFile("data/aa-model-speed.json", `${JSON.stringify(speedSnapshot, null, 2)}\n`);
console.log(`Saved ${speedSnapshot.speed_count} speed records from ${uniqueModels.size} Artificial Analysis models to data/aa-model-speed.json (${speedSnapshot.time_per_task_count} task times, ${speedSnapshot.first_answer_count} first answers, ${speedSnapshot.evaluation_time_count} models with evaluation times)`);
