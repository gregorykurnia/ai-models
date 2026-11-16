import { createHash, webcrypto } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { validateTimingCapture, withSpeedCaptureLock, type TimingCapture } from "./aa-speed-sources";

await withSpeedCaptureLock(async () => {
  const sourceUrl = "https://artificialanalysis.ai/models/gpt-6-1-sol-high";
  const response = await fetch(sourceUrl, { headers: { "user-agent": "ai-models-leaderboards/1.0" }, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Artificial Analysis returned ${response.status} for ${sourceUrl}`);
  const html = await response.text();
  const manifestEvidence: Array<{ source_url: string; sha256: string }> = [];

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
      const dataResponse = await fetch(dataUrl, { signal: AbortSignal.timeout(120000) });
      if (!dataResponse.ok) throw new Error(`Artificial Analysis returned ${dataResponse.status} for ${dataUrl}`);
      const bytes = Buffer.from(await dataResponse.arrayBuffer());
      let payload: unknown;
      if (manifest.key) {
        // Match AA's browser loader: AES-GCM, SHA-256(key)'s first 12 bytes as IV, then gzip.
        const key = Buffer.from(manifest.key, "hex");
        const cryptoKey = await webcrypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]);
        const decrypted = await webcrypto.subtle.decrypt({
          name: "AES-GCM",
          iv: createHash("sha256").update(key).digest().subarray(0, 12),
          tagLength: 128,
        }, cryptoKey, bytes);
        payload = JSON.parse(gunzipSync(Buffer.from(decrypted)).toString("utf8"));
      } else {
        payload = JSON.parse(bytes.toString("utf8"));
      }
      // The other manifest contains hosted endpoints, rather than creator-owned model records.
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const listedModels = (payload as { models?: Record<string, unknown>[] }).models;
        if (Array.isArray(listedModels)) {
          models.push(...listedModels);
          manifestEvidence.push({ source_url: String(dataUrl), sha256: createHash("sha256").update(bytes).digest("hex") });
        }
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
  const sources: Record<string, Record<string, unknown>> = {
    "model-payload": {
      source_url: response.url || sourceUrl,
      captured_at: capturedAt,
      page_sha256: createHash("sha256").update(html).digest("hex"),
      manifests: manifestEvidence,
      metric_paths: ["intelligenceIndexTimePerTask", "performance.headline.timeToFirstAnswerToken (or headline.timeToFirstAnswerToken)", "intelligenceIndexEvaluations[].timePerTask (legacy inline payload only)"],
      unit: "seconds",
    },
  };
  const seconds = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  const chartTimes = new Map<string, { times: Record<string, number>; provenance: Record<string, string> }>();
  const hasInlineEvaluationTimes = [...uniqueModels.values()].some(model =>
    Array.isArray(model.intelligenceIndexEvaluations) && model.intelligenceIndexEvaluations.some(evaluation => seconds(evaluation.timePerTask) !== null));
  if (manifestEvidence.length || !hasInlineEvaluationTimes) {
    const captureFile = "data/aa-speed-captures.json";
    const capture = JSON.parse(await readFile(captureFile, "utf8")) as TimingCapture;
    validateTimingCapture(capture, capturedAt);
    const modelsById = new Map<string, Record<string, unknown>>();
    for (const model of uniqueModels.values()) {
      if (typeof model.id !== "string") continue;
      if (modelsById.has(model.id)) throw new Error(`Duplicate AA model id: ${model.id}`);
      modelsById.set(model.id, model);
    }
    for (const chart of capture.evaluations) {
      const sourceId = `evaluation:${chart.evaluation_slug}`;
      sources[sourceId] = {
        source_url: chart.source_url, captured_at: chart.captured_at, capture_file: captureFile,
        sha256: createHash("sha256").update(JSON.stringify(chart)).digest("hex"),
        page_title: chart.title, unit: chart.unit, metric_path: chart.metric_path, selector: chart.selector,
        time_chart_present: chart.time_chart_present, unit_evidence: capture.unit_evidence,
      };
      for (const item of chart.items) {
        const model = modelsById.get(item.id);
        const creator = model?.creator as { name?: string } | undefined;
        if (typeof model?.slug !== "string" || typeof model.name !== "string" || !creator?.name) {
          throw new Error(`${chart.evaluation_slug}: timing row has no matching model identity: ${item.id}`);
        }
        const previous = chartTimes.get(model.slug) ?? { times: {}, provenance: {} };
        previous.times[chart.evaluation_slug] = item.seconds;
        previous.provenance[chart.evaluation_slug] = sourceId;
        chartTimes.set(model.slug, previous);
      }
    }
  }
  const speedRecords = [...uniqueModels.values()].flatMap(model => {
    const creator = model.creator as Record<string, unknown> | undefined;
    if (typeof model.slug !== "string" || typeof model.name !== "string" || typeof creator?.name !== "string") return [];
    const performance = model.performance as { headline?: { timeToFirstAnswerToken?: unknown } } | undefined;
    // Encrypted manifests flatten performance.headline onto each model record.
    const headline = performance?.headline ?? model.headline as { timeToFirstAnswerToken?: unknown } | undefined;
    const evaluations = model.intelligenceIndexEvaluations as Array<{ slug?: unknown; timePerTask?: unknown }> | undefined;
    const timePerTask = seconds(model.intelligenceIndexTimePerTask);
    const firstAnswer = seconds(headline?.timeToFirstAnswerToken);
    const evaluationTimes: Record<string, number> = Object.fromEntries((evaluations ?? []).flatMap(evaluation => {
      const time = seconds(evaluation.timePerTask);
      return typeof evaluation.slug === "string" && time !== null ? [[evaluation.slug, time]] : [];
    }));
    const evaluationProvenance = Object.fromEntries(Object.keys(evaluationTimes).map(slug => [slug, "model-payload"]));
    const chart = chartTimes.get(model.slug);
    Object.assign(evaluationTimes, chart?.times);
    Object.assign(evaluationProvenance, chart?.provenance);
    if (timePerTask === null && firstAnswer === null && !Object.keys(evaluationTimes).length) return [];
    return [{
      slug: model.slug,
      aa_model_id: typeof model.id === "string" ? model.id : null,
      name: model.name,
      provider: creator.name,
      url: `https://artificialanalysis.ai/models/${model.slug}`,
      time_per_task_s: timePerTask,
      first_answer_s: firstAnswer,
      evaluation_times_s: evaluationTimes,
      captured_at: capturedAt,
      provenance: {
        time_per_task_s: timePerTask === null ? null : "model-payload",
        first_answer_s: firstAnswer === null ? null : "model-payload",
        evaluation_times_s: evaluationProvenance,
      },
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
  const speedSnapshot = {
    format_version: 2,
    source_url: response.url || sourceUrl,
    captured_at: capturedAt,
    model_count: uniqueModels.size,
    speed_count: speedRecords.length,
    time_per_task_count: speedRecords.filter(record => record.time_per_task_s !== null).length,
    first_answer_count: speedRecords.filter(record => record.first_answer_s !== null).length,
    evaluation_time_count: speedRecords.filter(record => Object.keys(record.evaluation_times_s).length).length,
    sources,
    records: speedRecords,
  };
  // Stage both validated outputs before replacing either. A failed request or staging write preserves both.
  const costFile = "data/intelligence-index-costs.json";
  const speedFile = "data/aa-model-speed.json";
  const costTemporary = `${costFile}.${process.pid}.tmp`;
  const speedTemporary = `${speedFile}.${process.pid}.tmp`;
  try {
    await writeFile(costTemporary, `${JSON.stringify(snapshot, null, 2)}\n`);
    await writeFile(speedTemporary, `${JSON.stringify(speedSnapshot, null, 2)}\n`);
    await rename(costTemporary, costFile);
    await rename(speedTemporary, speedFile);
  } finally {
    await rm(costTemporary, { force: true });
    await rm(speedTemporary, { force: true, recursive: true });
  }
  console.log(`Saved ${records.length} costs from ${uniqueModels.size} Artificial Analysis models to data/intelligence-index-costs.json`);
  console.log(`Saved ${speedSnapshot.speed_count} speed records from ${uniqueModels.size} Artificial Analysis models to data/aa-model-speed.json (${speedSnapshot.time_per_task_count} task times, ${speedSnapshot.first_answer_count} first answers, ${speedSnapshot.evaluation_time_count} models with evaluation times)`);
});
