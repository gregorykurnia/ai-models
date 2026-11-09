import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import speedSource from "../data/aa-model-speed.json";
import type { Dataset, Entry } from "../src/lib/contract";
import { getIntelligenceIndexTaskCostMap } from "../src/lib/intelligence-index-costs";
import {
  aggregateMaster, averageMasterRank, masterIdentityKey, masterLeaderboardCsv,
  masterRowSchema, masterTableRows, sortMaster,
} from "../src/lib/master";
import {
  evaluationSpeedSlugs, formatFirstAnswer, formatTimePerTask, getModelSpeed,
  getModelSpeedMap, modelSpeedCapturedAt, modelSpeedCount, modelSpeedEvaluationSlugs,
  modelSpeedNameAliases, modelSpeedsForEntries, type ModelSpeed,
} from "../src/lib/model-speed";

const dataset = JSON.parse(await readFile(new URL("../data/leaderboards.json", import.meta.url), "utf8")) as Dataset;
const execFileAsync = promisify(execFile);

test("importer keeps task-only, first-answer-only, evaluation-only and zero values without a cost", async t => {
  const directory = await mkdtemp(join(tmpdir(), "ai-models-speed-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "data"));
  const model = (slug: string, fields: Record<string, unknown>) => ({ slug, name: slug, creator: { name: "Test" }, ...fields });
  const models = [
    model("cost-only", { intelligenceIndexCostPerTask: { cost: { total: 1 } } }),
    model("task-only", { intelligenceIndexTimePerTask: 120 }),
    model("nested-first-only", { performance: { headline: { timeToFirstAnswerToken: 2.25 } } }),
    model("flat-first-only", { headline: { timeToFirstAnswerToken: 0 } }),
    model("evaluation-only", { intelligenceIndexEvaluations: [{ slug: "aa-briefcase", timePerTask: 30 }, { slug: "omniscience", timePerTask: 0 }] }),
    model("zero-task", { intelligenceIndexTimePerTask: 0 }),
    model("invalid", { intelligenceIndexTimePerTask: -1, headline: { timeToFirstAnswerToken: "12" }, intelligenceIndexEvaluations: [{ slug: "aa-briefcase", timePerTask: null }] }),
  ];
  const flight = `"currentModel":${JSON.stringify(models[0])},"models":${JSON.stringify(models.slice(1))}`;
  const html = `self.__next_f.push([1,${JSON.stringify(flight)}])`;
  const scriptUrl = new URL("../scripts/import-aa-intelligence-index-costs.ts", import.meta.url).href;
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const { stdout } = await execFileAsync(process.execPath, [
    "--import", import.meta.resolve("tsx"), "--input-type=module", "--eval",
    `globalThis.fetch = async () => new Response(${JSON.stringify(html)}); await import(${JSON.stringify(scriptUrl)});`,
  ], { cwd: directory, env });
  const speeds = JSON.parse(await readFile(join(directory, "data/aa-model-speed.json"), "utf8")) as typeof speedSource;
  const costs = JSON.parse(await readFile(join(directory, "data/intelligence-index-costs.json"), "utf8"));
  assert.equal(speeds.speed_count, 5);
  assert.equal(speeds.time_per_task_count, 2);
  assert.equal(speeds.first_answer_count, 2);
  assert.equal(speeds.evaluation_time_count, 1);
  assert.equal(costs.cost_count, 1);
  assert.equal(costs.captured_at, speeds.captured_at);
  assert.ok(speeds.records.every(record => record.captured_at === speeds.captured_at));
  assert.equal(speeds.records.find(record => record.slug === "nested-first-only")!.first_answer_s, 2.25);
  assert.equal(speeds.records.find(record => record.slug === "flat-first-only")!.first_answer_s, 0);
  assert.deepEqual(speeds.records.find(record => record.slug === "evaluation-only")!.evaluation_times_s, { "aa-briefcase": 30, omniscience: 0 });
  assert.equal(speeds.records.find(record => record.slug === "evaluation-only")!.time_per_task_s, null);
  assert.ok(!speeds.records.some(record => record.slug === "invalid" || record.slug === "cost-only"));
  assert.match(stdout, /Saved 1 costs from 7 Artificial Analysis models/);
  assert.match(stdout, /Saved 5 speed records.*2 task times, 2 first answers, 1 models with evaluation times/);
});

test("speed lookup matches AA's named fallback to the sheet's adaptive-reasoning spelling", () => {
  const fable = getModelSpeed("Anthropic", "Claude Fable 5 (Adaptive Reasoning, Max Effort, Opus 4.8 Fallback)");
  assert.equal(fable?.slug, "claude-fable-5");
  assert.equal(formatFirstAnswer(fable?.first_answer_s), "97.3");
  assert.equal(getModelSpeed("Anthropic", "Claude Fable 5 (with fallback)"), null);
  assert.deepEqual(modelSpeedNameAliases("Claude Opus 5.5 (High, Default Fallback)"), ["Claude Opus 5.5 (High, Default Fallback)"]);
});

test("speed lookup matches cost identity rules, exact effort variants and unique model fallback", () => {
  const opus = getModelSpeed("Anthropic", "Claude Opus 5.5 (high with fallback)");
  assert.ok(opus);
  assert.equal(opus.slug, "claude-opus-5-5-high");
  assert.equal(getModelSpeed(" ANTHROPIC ", "Claude Opus 5.5 (Adaptive Reasoning, High Effort, Default Fallback)"), opus);
  assert.equal(getModelSpeed("Anthropic", "Claude Opus 5.5 (High, Default Fallback)"), opus);
  assert.equal(getModelSpeed("Different provider label", opus.model), opus);
  assert.equal(getModelSpeed("Anthropic", "Claude Opus 5.5 (High)"), null);
  const sol = getModelSpeed("OpenAI", "GPT-6.1 Sol (Max)");
  assert.equal(sol?.slug, "gpt-6-1-sol");
  assert.equal(getModelSpeed("OpenAI", "GPT-6.1 Sol (Reasoning, High Effort)")?.slug, "gpt-6-1-sol-high");
  assert.equal(getModelSpeed("OpenAI", "Unknown model"), null);
  for (const speed of [opus, sol!]) {
    const raw = speedSource.records.find(record => record.slug === speed.slug)!;
    assert.equal(speed.time_per_task_s, raw.time_per_task_s);
    assert.equal(speed.first_answer_s, raw.first_answer_s);
    assert.ok(speed.time_per_task_s! > 0);
    assert.ok(speed.first_answer_s! > 0);
    assert.equal(speed.url, `https://artificialanalysis.ai/models/${speed.slug}`);
    assert.equal(getModelSpeedMap().get(masterIdentityKey(speed.provider, speed.model)), speed);
    assert.equal(getModelSpeedMap().get(masterIdentityKey("", speed.model)), speed);
  }
  const groups = new Map<string, Set<string>>();
  for (const record of speedSource.records) {
    const key = masterIdentityKey("", record.name);
    groups.set(key, new Set([...(groups.get(key) ?? []), record.slug]));
  }
  for (const [key, slugs] of groups) {
    if (slugs.size > 1) assert.equal(getModelSpeedMap().get(key), null);
  }
  assert.equal(modelSpeedCount, speedSource.records.length);
  assert.equal(modelSpeedCapturedAt, speedSource.captured_at);
  const matches = modelSpeedsForEntries(dataset.entries);
  const opusEntry = dataset.entries.find(entry => entry.provider === opus.provider && masterIdentityKey("", entry.model) === masterIdentityKey("", opus.model))!;
  assert.equal(matches[opusEntry.id], opus);
});

test("every local evaluation has an explicit slug mapping or page-wide fallback", () => {
  assert.deepEqual(Object.keys(evaluationSpeedSlugs).sort(), dataset.evaluations.map(evaluation => evaluation.id).sort());
  assert.deepEqual(modelSpeedEvaluationSlugs, [
    "aa-briefcase", "automationbench-aa", "critpt-v2-hard", "frontiercode-2-0", "gdp-pdf",
    "hle-diamond", "omniscience", "terminal-bench-science", "terminalbench-4-0",
  ]);
  const expected = {
    "briefcase-v1-1": "aa-briefcase",
    "aa-briefcase-rubric-score": "aa-briefcase",
    "aa-briefcase-analytical-quality-elo": "aa-briefcase",
    "aa-briefcase-presentation-elo": "aa-briefcase",
    "aa-omniscience-index": "omniscience",
    "aa-omniscience-accuracy": "omniscience",
    "automationbench-aa": "automationbench-aa",
    "terminal-bench-4-0": "terminalbench-4-0",
    "frontiercode-2-0": "frontiercode-2-0",
    "gdp-pdf": "gdp-pdf",
    "hle-diamond": "hle-diamond",
  };
  for (const evaluation of dataset.evaluations) {
    assert.equal(evaluationSpeedSlugs[evaluation.id], expected[evaluation.id as keyof typeof expected] ?? null);
    const slug = evaluationSpeedSlugs[evaluation.id];
    if (slug) assert.ok(modelSpeedEvaluationSlugs.includes(slug));
  }
  assert.equal(evaluationSpeedSlugs.critpt, null, "CritPt v2 Hard must not be used for original CritPt");
});

test("speed formatters show minutes and seconds to one decimal, retaining zero and missing dashes", () => {
  assert.equal(formatTimePerTask(573.577226220931), "9.6");
  assert.equal(formatTimePerTask(1191.9160855326827), "19.9");
  assert.equal(formatTimePerTask(60), "1.0");
  assert.equal(formatFirstAnswer(32.19038145549805), "32.2");
  assert.equal(formatFirstAnswer(179.12935145481586), "179.1");
  for (const format of [formatTimePerTask, formatFirstAnswer]) {
    assert.equal(format(0), "0.0");
    for (const missing of [null, undefined, NaN, Infinity, -1]) assert.equal(format(missing), "—");
  }
});

const evaluation = dataset.evaluations[0];
const baseEntry = dataset.entries.find(entry => entry.evaluation_id === evaluation.id)!;
const opusSpeed = getModelSpeed("Anthropic", "Claude Opus 5.5 (high with fallback)")!;
const fixture = (model: string, rank: number, speed: ModelSpeed | null) => {
  const entry: Entry = { ...baseEntry, id: model, model_id: model, provider: "Fixture", model, source_rank: rank };
  return aggregateMaster([evaluation], [entry], new Map(), new Map([[masterIdentityKey(entry.provider, model), speed]])).rows[0];
};

test("master rows retain speed without affecting quality; speed sorts fastest first and missing last", () => {
  const baseline = aggregateMaster(dataset.evaluations, dataset.entries, getIntelligenceIndexTaskCostMap());
  const withSpeed = aggregateMaster(dataset.evaluations, dataset.entries, getIntelligenceIndexTaskCostMap(), getModelSpeedMap());
  for (let i = 0; i < withSpeed.rows.length; i++) {
    const row = withSpeed.rows[i];
    masterRowSchema.parse(row);
    assert.deepEqual(averageMasterRank(row), averageMasterRank(baseline.rows[i]));
    assert.equal(row.speed, getModelSpeed(row.provider, row.model));
  }
  assert.ok(withSpeed.rows.some(row => row.speed?.slug === "claude-opus-5-5-high"));
  assert.ok(withSpeed.rows.some(row => row.speed?.slug === "gpt-6-1-sol"));
  assert.equal(masterTableRows(withSpeed.rows)[0].speed, withSpeed.rows[0].speed);
  const rows = [
    fixture("Missing record", 1, null),
    fixture("Missing values", 2, { ...opusSpeed, time_per_task_s: null, first_answer_s: null }),
    fixture("Slow", 3, { ...opusSpeed, time_per_task_s: 60.02, first_answer_s: 2.02 }),
    fixture("Fast", 4, { ...opusSpeed, time_per_task_s: 60.01, first_answer_s: 2.01 }),
    fixture("Zero", 5, { ...opusSpeed, time_per_task_s: 0, first_answer_s: 0 }),
  ];
  for (const sort of ["time-per-task", "first-answer"]) {
    assert.deepEqual(sortMaster(rows, sort, "asc").map(row => row.model), ["Zero", "Fast", "Slow", "Missing record", "Missing values"]);
    assert.deepEqual(sortMaster(rows, sort, "desc").map(row => row.model), ["Slow", "Fast", "Zero", "Missing record", "Missing values"]);
    assert.deepEqual(sortMaster(rows, sort, "asc"), sortMaster([...rows].reverse(), sort, "asc"));
  }
  assert.equal(rows[0].model, "Missing record", "sorting must not mutate input");
});

test("CSV adds precise task minutes and first-answer seconds immediately after cost", () => {
  const rows = [
    fixture("Known", 1, { ...opusSpeed, time_per_task_s: 90, first_answer_s: 2.25 }),
    fixture("Missing", 2, null),
    fixture("Zero", 3, { ...opusSpeed, time_per_task_s: 0, first_answer_s: 0 }),
  ];
  const csv = masterLeaderboardCsv(rows, [evaluation]);
  const [header, known, missing, zero] = csv.replace(/^\ufeff/, "").trimEnd().split("\r\n");
  assert.deepEqual(header.split(",").slice(0, 7), [
    "Model", "Provider", "Cost Per Intelligence Index Task (USD)", "Time per Task (minutes)",
    "First Answer (seconds)", "Aggregate Score (average rank)", "Aggregate Score dimensions used (of 9)",
  ]);
  assert.deepEqual(known.split(",").slice(3, 5), ["1.5", "2.25"]);
  assert.deepEqual(missing.split(",").slice(3, 5), ["", ""]);
  assert.deepEqual(zero.split(",").slice(3, 5), ["0", "0"]);
  assert.ok(csv.startsWith("\ufeff"));
});
