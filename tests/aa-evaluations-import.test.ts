import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test, type TestContext } from "node:test";
import { assertCompleteScoreChart, completeModelSelectionCount, selectCaptureTargets } from "../scripts/capture-aa-evaluations.mjs";
import { canonicalModelName } from "../scripts/aa-model-names";
import type { Dataset } from "../src/lib/contract";
import { aggregateDimensionIds, aggregateMaster, averageMasterRank, masterIdentityKey, masterLeaderboardCsv, masterTableRows, orderMasterEvaluations, sortMaster } from "../src/lib/master";
import { terminalBenchRedirect } from "../src/lib/leaderboard-redirects";
import { calculateSuitability } from "../src/lib/suitability";
import { buildPlannerData } from "../src/lib/suitability-data";

const execFileAsync = promisify(execFile);
const businessKey = "omniscience-business";
const businessId = "aa-omniscience-business";
const businessTitle = "AA-Omniscience Net Score by Domain: Business";
const businessUrl = "https://artificialanalysis.ai/evaluations/omniscience?detailed-domain-results=omniscience-net-score-by-domain";

async function importWorkspace(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "ai-models-evaluations-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const data = join(directory, "data");
  await mkdir(join(data, "aa-captures"), { recursive: true });
  for (const file of ["leaderboards.json", "aa-briefcase-components.json", "aa-briefcase-rubric-refresh.json", "intelligence-index-costs.json"]) {
    await copyFile(new URL(`../data/${file}`, import.meta.url), join(data, file));
  }
  for (const file of await readdir(new URL("../data/aa-captures/", import.meta.url))) {
    if (file.endsWith(".json")) await copyFile(new URL(`../data/aa-captures/${file}`, import.meta.url), join(data, "aa-captures", file));
  }
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = () => execFileAsync(process.execPath, ["--import", import.meta.resolve("tsx"),
    fileURLToPath(new URL("../scripts/import-aa-evaluations.ts", import.meta.url))], { cwd: directory, env });
  return { data, run };
}

test("AA's renamed GLM-5.3-Flash (Max) keeps the master's GLM-5.3-Flash row on every page", async () => {
  assert.equal(canonicalModelName("GLM-5.3-Flash (Max)"), "GLM-5.3-Flash");
  assert.equal(canonicalModelName("GLM-5.3 (Max)"), "GLM-5.3 (Max)");
  const dataset = JSON.parse(await readFile("data/leaderboards.json", "utf8")) as Dataset;
  const glm = dataset.entries.filter(entry => /^GLM-5\.3-Flash/.test(entry.model));
  assert.ok(glm.length > 10);
  assert.deepEqual([...new Set(glm.map(entry => entry.model))], ["GLM-5.3-Flash"]);
  assert.ok(glm.some(entry => entry.evaluation_id === "swe-atlas-qna-aa"));
  const costs = JSON.parse(await readFile("data/intelligence-index-costs.json", "utf8")) as { records: { name: string }[] };
  assert.ok(costs.records.some(record => record.name === "GLM-5.3-Flash"));
  assert.ok(!costs.records.some(record => record.name === "GLM-5.3-Flash (Max)"));
});

test("AA capture requires the score chart's own complete selector and matching row count", () => {
  const score = { title: "AA-Omniscience Accuracy", selectorLabels: ["2 of 2 models"], items: [{ id: "a" }, { id: "b" }] };
  const netScore = { ...score, title: "AA-Omniscience v1.1: Net Score" };
  assert.doesNotThrow(() => assertCompleteScoreChart([netScore, score], score.title));
  assert.throws(
    () => assertCompleteScoreChart([netScore, { ...score, selectorLabels: ["1 of 2 models"] }], score.title),
    /incomplete score chart "AA-Omniscience Accuracy" \(1 of 2 models, 2 scores\)/,
  );
  assert.throws(() => assertCompleteScoreChart([{ ...score, items: score.items.slice(0, 1) }], score.title), /2 of 2 models, 1 scores/);
});

test("Terminal-Bench imports complete scores, retires the previous snapshot, and contributes to average rank", async t => {
  const { data, run } = await importWorkspace(t);
  const datasetPath = join(data, "leaderboards.json");
  const capturePath = join(data, "aa-captures", "terminalbench-4-1.json");
  const original = JSON.parse(await readFile(datasetPath, "utf8")) as Dataset;
  const { from, to } = terminalBenchRedirect;
  const retiredCaptureKey = from.replace("terminal-bench-", "terminalbench-");
  const legacy = original.evaluations.find(evaluation => evaluation.id === from || evaluation.id === to)!;
  const text = JSON.stringify(original)
    .replaceAll(legacy.id, from)
    .replaceAll("terminalbench-4-1", retiredCaptureKey)
    .replaceAll(legacy.display_name, "Previous Terminal Bench");
  await writeFile(datasetPath, text);

  const longName = `Model ${"with a long name ".repeat(25).trim()}`;
  const models = [
    { id: "fixture-best", name: "Top model", creatorName: "Evaluation fixture", value: 0.682 },
    { id: "fixture-bottom", name: longName, creatorName: "Evaluation fixture", value: 0 },
  ];
  const title = "Terminal-Bench 4.1: Score";
  const costs = [{ ...models[0], costPerTask: 0.64 }];
  const capture = {
    key: "terminalbench-4-1", source_url: "https://artificialanalysis.ai/evaluations/terminalbench-4-1",
    captured_at: "2026-11-24", tables: [],
    charts: [
      { title, selectorLabels: ["2 of 2 models"], items: models },
      { title: `${title} vs. Cost per Task`, items: costs },
    ],
  };
  const writeCapture = (charts: { title: string; selectorLabels?: string[]; items: unknown[] }[] = capture.charts) =>
    writeFile(capturePath, JSON.stringify({ ...capture, charts }));
  const score = capture.charts[0];
  const failures = [
    { charts: [{ ...score, selectorLabels: ["1 of 2 models"] }, capture.charts[1]], error: /incomplete score chart/ },
    { charts: [score], error: /cost chart .* is missing/ },
    { charts: [{ ...score, items: [models[0], { ...models[1], name: " " }] }, capture.charts[1]], error: /missing model name/ },
    { charts: [{ ...score, items: [models[0], { ...models[1], name: " top model " }] }, capture.charts[1]], error: /duplicate model/i },
  ];
  for (const { charts, error } of failures) {
    await writeCapture(charts);
    await assert.rejects(run(), error);
    assert.equal(await readFile(datasetPath, "utf8"), text);
  }

  await writeCapture();
  await run();
  const saved = await readFile(datasetPath, "utf8");
  const imported = JSON.parse(saved) as Dataset;
  const benchmark = imported.evaluations.find(evaluation => evaluation.id === to)!;
  assert.equal(imported.evaluations.length, original.evaluations.length);
  assert.equal(benchmark.row_count, 2);
  assert.doesNotMatch(benchmark.notes, /profiles|fallback/i);
  assert.deepEqual(imported.entries.filter(entry => entry.evaluation_id === to).map(entry => [
    entry.model, entry.source_rank, entry.score_value, entry.cost_usd,
  ]), [["Top model", 1, 0.682, 0.64], [longName, 2, 0, null]]);
  assert(!imported.evaluations.some(evaluation => evaluation.id === from));
  assert(!imported.entries.some(entry => entry.evaluation_id === from));
  assert(!imported.snapshots.some(snapshot => snapshot.evaluation_id === from));
  const retiredFilename = `aa-captures/${retiredCaptureKey}.json`;
  assert(!imported.sourceAssets?.some(asset => asset.filename === retiredFilename));

  const catalog = new Set(imported.evaluations.map(evaluation => evaluation.id));
  assert.equal(aggregateDimensionIds.length, 9);
  assert.ok(aggregateDimensionIds.includes(to));
  assert.ok(aggregateDimensionIds.every(id => catalog.has(id)));
  const master = aggregateMaster(imported.evaluations, imported.entries);
  const row = master.rows.find(row => row.model === longName)!;
  assert.equal(row.cells[to].href, `/leaderboards/${to}?q=${encodeURIComponent(longName)}`);
  assert.deepEqual(averageMasterRank(row), { score: 2, count: 1 });
  await run();
  assert.equal(await readFile(datasetPath, "utf8"), saved);
});

test("AA capture rejects missing, ambiguous, or invalid score chart evidence", () => {
  const score = { title: "CritPt: Score", selectorLabels: ["1 of 1 models"], items: [{ id: "a" }] };
  assert.throws(() => assertCompleteScoreChart([], score.title), /expected one score chart.*found 0/);
  assert.throws(() => assertCompleteScoreChart([score, score], score.title), /expected one score chart.*found 2/);
  for (const selectorLabels of [[], [...score.selectorLabels, ...score.selectorLabels]]) {
    assert.throws(() => assertCompleteScoreChart([{ ...score, selectorLabels }], score.title), /needs one model selector/);
  }
  for (const label of ["", "All models", `${"9".repeat(400)} of ${"9".repeat(400)} models`]) {
    assert.throws(() => assertCompleteScoreChart([{ ...score, selectorLabels: [label] }], score.title), /incomplete score chart/);
  }
  assert.throws(() => assertCompleteScoreChart([{ ...score, selectorLabels: ["0 of 0 models"], items: [] }], score.title), /0 of 0 models, 0 scores/);
});

test("Business is a default capture target and requires its own complete model selection", () => {
  const target = selectCaptureTargets([], undefined).find(page => page.key === businessKey);
  assert.ok(target);
  assert.equal(target.url, businessUrl);
  assert.deepEqual(target.scoreCharts, [businessTitle]);
  assert.deepEqual(selectCaptureTargets(["--only", businessKey], undefined), [target]);

  const score = { title: businessTitle, selectorLabels: ["169 of 169 models"], items: Array.from({ length: 169 }, (_, id) => ({ id })) };
  const law = { ...score, title: "AA-Omniscience Net Score by Domain: Law" };
  assert.doesNotThrow(() => assertCompleteScoreChart([law, score], target.scoreCharts[0]));
  assert.throws(() => assertCompleteScoreChart([law], target.scoreCharts[0]), /expected one score chart "AA-Omniscience Net Score by Domain: Business", found 0/);
  const partial = { ...score, selectorLabels: ["28 of 169 models"], items: score.items.slice(0, 28) };
  assert.throws(() => assertCompleteScoreChart([law, partial], target.scoreCharts[0]), /incomplete score chart "AA-Omniscience Net Score by Domain: Business" \(28 of 169 models, 28 scores\)/);
});

test("Business imports each signed score and preserves existing master ranks and order", async t => {
  const { data, run } = await importWorkspace(t);
  const datasetPath = join(data, "leaderboards.json");
  const costsPath = join(data, "intelligence-index-costs.json");
  const capturePath = join(data, "aa-captures", `${businessKey}.json`);
  const readDataset = async () => JSON.parse(await readFile(datasetPath, "utf8")) as Dataset;
  const bundled = await readDataset();
  const baseline = {
    ...bundled,
    evaluations: bundled.evaluations.filter(evaluation => evaluation.id !== businessId),
    entries: bundled.entries.filter(entry => entry.evaluation_id !== businessId),
    snapshots: bundled.snapshots.filter(snapshot => snapshot.evaluation_id !== businessId),
  };
  await writeFile(datasetPath, JSON.stringify(baseline));

  type ScoreItem = { id: string; value: number; tooltipLabel: string; logo: string };
  const captureText = await readFile(capturePath, "utf8");
  const capture = JSON.parse(captureText) as { charts: { title: string; selectorLabels: string[]; items: ScoreItem[] }[] };
  assertCompleteScoreChart(capture.charts, businessTitle);
  const chart = capture.charts.find(chart => chart.title === businessTitle)!;
  await run();
  const dataset = await readDataset();
  const business = dataset.evaluations.find(evaluation => evaluation.id === businessId);
  const overall = baseline.evaluations.find(evaluation => evaluation.id === "aa-omniscience-index");
  assert.ok(business && overall);
  assert.equal(business.slug, businessId);
  assert.equal(business.display_name, "AA-Omniscience Net Score: Business");
  assert.equal(business.source_url, businessUrl);
  assert.equal(business.notes, "Net Score on the Business questions of AA-Omniscience v1.1 only.");
  for (const key of ["metric_key", "metric_label", "score_kind", "score_unit", "score_min", "score_max"] as const) {
    assert.equal(business[key], overall[key], key);
  }
  assert.equal(business.row_count, chart.items.length);
  assert.equal(business.cost_label_count, 0);
  assert.equal(dataset.snapshots.find(snapshot => snapshot.id === business.published_snapshot_id)?.row_count, business.row_count);
  assert.equal(dataset.report.evaluation_count, baseline.evaluations.length + 1);
  assert.deepEqual(dataset.evaluations.filter(evaluation => evaluation.id !== businessId), baseline.evaluations);
  assert.deepEqual(dataset.entries.filter(entry => entry.evaluation_id !== businessId), baseline.entries);

  const entries = dataset.entries.filter(entry => entry.evaluation_id === businessId);
  const entriesById = new Map(entries.map(entry => [entry.id, entry]));
  assert.equal(entries.length, chart.items.length);
  for (const item of chart.items) {
    const id = createHash("sha256").update(`${business.published_snapshot_id}:${item.id}:${businessId}`).digest("hex").slice(0, 24);
    const entry = entriesById.get(id);
    assert.ok(entry, item.tooltipLabel);
    assert.equal(entry.score_value, item.value);
    assert.equal(entry.source_rank, 1 + entries.filter(other => other.score_value > item.value).length);
    assert.equal(entry.cost_usd, null);
  }
  assert(entries.some(entry => entry.score_value < 0));
  assert(entries.some(entry => entry.model === "Gemini 4 Neon (Xhigh)" && entry.provider === "Google"));
  assert(entries.some(entry => entry.model === "JoyAI-VL-Preview" && entry.provider === "Joy Future Academy"));

  const before = aggregateMaster(baseline.evaluations, baseline.entries).rows;
  const master = aggregateMaster([business, ...baseline.evaluations], dataset.entries).rows;
  const beforeIds = new Set(before.map(row => row.identity_key));
  const masterWithBusiness = master.filter(row => row.cells[businessId]);
  assert.deepEqual(new Set(masterWithBusiness.map(row => row.identity_key)), new Set(entries.map(row => masterIdentityKey(row.provider, row.model))));
  assert(master.filter(row => !beforeIds.has(row.identity_key)).every(row => averageMasterRank(row) === null));
  const rank = (row: (typeof master)[number]) => [row.identity_key, row.model_id, row.source_rank, averageMasterRank(row)];
  const existing = master.filter(row => beforeIds.has(row.identity_key));
  assert.deepEqual(existing.map(rank), before.map(rank));
  for (const sort of ["aggregate-score", "intelligence-index"]) {
    for (const direction of ["asc", "desc"]) {
      assert.deepEqual(sortMaster(existing, sort, direction).map(rank), sortMaster(before, sort, direction).map(rank));
    }
  }
  const order = orderMasterEvaluations(dataset.evaluations).map(evaluation => evaluation.id);
  assert.equal(order[order.indexOf("aa-omniscience-index") + 1], businessId);
  assert.match(masterLeaderboardCsv(masterTableRows(master), dataset.evaluations).split("\n")[0], /,Omniscience Index,Omniscience Business,/);

  const planner = buildPlannerData(dataset.evaluations, dataset.entries);
  const scores = calculateSuitability({ ...planner, weights: [
    { evaluation_id: businessId, weight: 100, captured_at: business.captured_at, snapshot_id: business.published_snapshot_id },
  ] });
  assert.equal(scores.filter(score => score.complete_coverage).length, chart.items.length);

  const readOutputs = () => Promise.all([datasetPath, costsPath].map(file => readFile(file, "utf8")));
  const saved = await readOutputs();
  const sample = chart.items.find(item => item.tooltipLabel === "Gemini 4 Neon (Xhigh)")!;
  const invalid = [
    { chart: { ...chart, title: "AA-Omniscience Net Score by Domain: Law" }, error: /aa-omniscience-business: chart .* Business.* is missing/ },
    { chart: { ...chart, items: [...chart.items, { id: "blank", value: 0, logo: sample.logo, tooltipLabel: " " }] }, error: /aa-omniscience-business: missing model name/ },
    { chart: { ...chart, items: [...chart.items, { ...sample, id: "duplicate", tooltipLabel: sample.tooltipLabel.toLowerCase() }] }, error: /aa-omniscience-business: duplicate model/ },
  ];
  for (const { chart, error } of invalid) {
    await writeFile(capturePath, JSON.stringify({ ...capture, charts: [chart] }));
    await assert.rejects(run, error);
    assert.deepEqual(await readOutputs(), saved);
  }
  await writeFile(capturePath, captureText);
  await run();
  assert.deepEqual(await readOutputs(), saved);
});

test("AA import preserves FrontierCode and separate CritPt datasets, rejects bad captures, and supports reruns", async t => {
  const { data, run } = await importWorkspace(t);
  const captureFile = join(data, "aa-captures/frontiercode-2-0.json");
  const capture = JSON.parse(await readFile(captureFile, "utf8"));
  for (const chart of capture.charts) chart.title = chart.title.replace(/^FrontierCode(?:-AA)? 2\.0:/, "FrontierCode-AA 2.0:");
  await writeFile(captureFile, JSON.stringify(capture));
  const scoreChart = capture.charts.find((chart: { title: string }) => chart.title === "FrontierCode-AA 2.0: Score");
  const costChart = capture.charts.find((chart: { title: string }) => chart.title === "FrontierCode-AA 2.0: Score vs. Cost per Task");
  assert.ok(scoreChart?.items.length);
  assert.ok(costChart?.items.length);
  await run();
  const dataset = JSON.parse(await readFile(join(data, "leaderboards.json"), "utf8")) as Dataset;
  const rows = dataset.entries.filter(entry => entry.evaluation_id === "frontiercode-2-0");
  assert.equal(rows.length, scoreChart.items.length);
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const snapshot = `frontiercode-2-0-${hash(JSON.stringify(capture)).slice(0, 16)}`;
  const costs = new Map(costChart.items.map((item: { id: string; costPerTask: number }) => [item.id, item.costPerTask]));
  for (const item of scoreChart.items) {
    const row = rows.find(entry => entry.id === hash(`${snapshot}:${item.id}:frontiercode-2-0`).slice(0, 24));
    assert.ok(row);
    assert.equal(row.score_value, item.value);
    assert.equal(row.cost_usd, costs.get(item.id) ?? null);
  }
  const expectedCosts = costChart.items.filter((item: { costPerTask?: number }) => typeof item.costPerTask === "number");
  assert.ok(expectedCosts.length > 0);
  assert.equal(rows.filter(row => row.cost_usd !== null).length, expectedCosts.length);
  const subsets = ["critpt-v2-full", "critpt-v2-hard"];
  const { rows: masterRows } = aggregateMaster(dataset.evaluations, dataset.entries);
  const model = masterRows.find(row => row.provider === "OpenAI" && row.model === "GPT-6.2 Astra (Max)");
  assert.ok(model);
  assert.equal(model.cells.critpt, undefined);
  const order = orderMasterEvaluations(dataset.evaluations).map(evaluation => evaluation.id);
  assert.deepEqual(order.slice(order.indexOf("critpt") + 1, order.indexOf("critpt") + 3), subsets);
  const csvHeader = masterLeaderboardCsv(masterTableRows([model]), dataset.evaluations).split("\n")[0];
  assert.match(csvHeader, /CritPt,CritPt v2 \(Full Set\),CritPt v2 \(Hard Subset\)/);
  for (const id of subsets) {
    const subset = JSON.parse(await readFile(join(data, `aa-captures/${id}.json`), "utf8"));
    const evaluation = dataset.evaluations.find(evaluation => evaluation.id === id);
    assert.ok(evaluation);
    assert.equal(evaluation.source_url, subset.source_url);
    assert.equal(evaluation.score_kind, "percentage");
    assert.ok(model.cells[id].href.startsWith(`/leaderboards/${id}?q=`));
    const title = id === "critpt-v2-hard" ? "CritPt v2 (Hard Subset): Score" : "CritPt v2: Score";
    const scores = subset.charts.find((chart: { title: string }) => chart.title === title).items;
    const costs = new Map<string, number>(subset.charts.find((chart: { title: string }) => chart.title === `${title} vs. Cost per Task`).items
      .map((item: { id: string; costPerTask: number }) => [item.id, item.costPerTask]));
    const entries = dataset.entries.filter(entry => entry.evaluation_id === id);
    assert.equal(evaluation.row_count, scores.length);
    assert.equal(entries.length, scores.length);
    const entriesById = new Map(entries.map(entry => [entry.id, entry]));
    for (const score of scores) {
      const entry = entriesById.get(hash(`${evaluation.published_snapshot_id}:${score.id}:${id}`).slice(0, 24));
      assert.ok(entry);
      assert.equal(entry.score_value, score.value * 100);
      assert.equal(entry.cost_usd, costs.get(score.id) ?? null);
      assert.equal(entry.source_rank, entries.filter(row => row.score_value > entry.score_value).length + 1);
    }
  }
  assert.notEqual(model.cells[subsets[0]].entry.score_value, model.cells[subsets[1]].entry.score_value);
  const outputs = ["leaderboards.json", "intelligence-index-costs.json"];
  const saved = await Promise.all(outputs.map(file => readFile(join(data, file), "utf8")));
  await run();
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(join(data, file), "utf8"))), saved);
  scoreChart.title = "Unrecognized score chart";
  await writeFile(captureFile, JSON.stringify(capture));
  await assert.rejects(run, /frontiercode-2-0: chart .* is missing/);
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(join(data, file), "utf8"))), saved);
  scoreChart.title = "FrontierCode-AA 2.0: Score";
  scoreChart.items.push(scoreChart.items[0]);
  await writeFile(captureFile, JSON.stringify(capture));
  await assert.rejects(run, /frontiercode-2-0: duplicate model/);
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(join(data, file), "utf8"))), saved);
  scoreChart.items.pop();
  await writeFile(captureFile, JSON.stringify(capture));

  const hardPath = join(data, "aa-captures/critpt-v2-hard.json");
  const hardText = await readFile(hardPath, "utf8");
  const hard = JSON.parse(hardText);
  const hardScore = hard.charts.find((chart: { title: string }) => chart.title === "CritPt v2 (Hard Subset): Score");
  const item = hardScore.items[0];
  const duplicate = { ...item, id: "duplicate-model", name: model.model.toLowerCase(), creatorName: model.provider };
  // Swap in a changed score chart and keep the capture's other charts (the cost chart among them).
  const otherHardCharts = hard.charts.filter((chart: { title: string }) => chart !== hardScore);
  const withScores = (items: unknown[]) => [{ ...hardScore, items }, ...otherHardCharts];
  const badHard = [
    { change: { ...hard, source_url: hard.source_url.split("?")[0] }, error: /unexpected capture URL/ },
    { change: { ...hard, charts: withScores([]) }, error: /has no scores/ },
    { change: { ...hard, charts: withScores([{ ...item, value: null }]) }, error: /invalid value/ },
    { change: { ...hard, charts: withScores([{ ...item, value: 1.01 }]) }, error: /invalid value/ },
    { change: { ...hard, charts: withScores([{ ...item, id: "blank-name", name: " " }]) }, error: /missing model name/ },
    { change: { ...hard, charts: withScores([...hardScore.items, duplicate]) }, error: /duplicate model/ },
    { change: { ...hard, charts: [hardScore] }, error: /cost chart .* is missing/ },
  ];
  for (const { change, error } of badHard) {
    await writeFile(hardPath, JSON.stringify(change));
    await assert.rejects(run, error);
    assert.deepEqual(await Promise.all(outputs.map(file => readFile(join(data, file), "utf8"))), saved);
  }
  await rm(hardPath);
  await assert.rejects(run, /ENOENT.*critpt-v2-hard/);
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(join(data, file), "utf8"))), saved);
  await writeFile(hardPath, hardText);
  await Promise.all([run(), run()]);
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(join(data, file), "utf8"))), saved);
  const longName = `Model ${"with a long name ".repeat(25).trim()}`;
  hardScore.items.push({ ...duplicate, id: "long-model", name: longName, value: 0 });
  await writeFile(hardPath, JSON.stringify(hard));
  await run();
  const expanded = JSON.parse(await readFile(join(data, "leaderboards.json"), "utf8")) as Dataset;
  assert.ok(expanded.entries.some(entry => entry.evaluation_id === "critpt-v2-hard" && entry.model === longName && entry.score_value === 0));
});

type AtlasItem = { id: string; name: string; modelName: string; creatorName: string; effort?: string | null; value: number | null };
type AtlasCapture = { charts: { title: string; selectorLabels: string[]; items: AtlasItem[] }[] };

test("SWE-Atlas-QnA imports only the documented master models and preserves the rest of the master", async t => {
  const { data, run } = await importWorkspace(t);
  const id = "swe-atlas-qna-aa";
  const datasetPath = join(data, "leaderboards.json");
  const capturePath = join(data, "aa-captures", `${id}.json`);
  const readDataset = async () => JSON.parse(await readFile(datasetPath, "utf8")) as Dataset;
  const bundled = await readDataset();
  const baseline = {
    ...bundled,
    evaluations: bundled.evaluations.filter(evaluation => evaluation.id !== id),
    entries: bundled.entries.filter(entry => entry.evaluation_id !== id),
    snapshots: bundled.snapshots.filter(snapshot => snapshot.evaluation_id !== id),
    sourceAssets: bundled.sourceAssets?.filter(asset => asset.filename !== `aa-captures/${id}.json`),
  };
  await writeFile(datasetPath, JSON.stringify(baseline));
  const captureText = await readFile(capturePath, "utf8");
  const capture = JSON.parse(captureText) as AtlasCapture;
  const chart = capture.charts.find(chart => chart.title === "SWE-Atlas-QnA-AA: Score");
  assert.ok(chart);
  assertCompleteScoreChart(capture.charts, chart.title);
  const selectorCount = completeModelSelectionCount(chart.selectorLabels[0]);
  assert.equal(chart.items.length, selectorCount);
  const inventory = await readFile(new URL("../docs/SWE_ATLAS_QNA_CAPTURE.md", import.meta.url), "utf8");
  const mappings = new Map(inventory.split("\n").flatMap(line => {
    const [, setup, score, model] = line.split("|").map(cell => cell.trim());
    return line.startsWith("| ") && score?.endsWith("%") && model ? [[setup, model] as const] : [];
  }));
  const mapped = chart.items.filter(item => mappings.has(item.name!));
  const scoresByName = new Map(mapped.map(item => [mappings.get(item.name!), item.value! * 100]));
  const rowCount = mappings.size;
  assert.equal(mapped.length, rowCount);
  assert.equal(scoresByName.size, rowCount);
  // AA runs some models in more than one agent; every skipped setup is another run of a mapped model.
  const mappedModels = new Set(mapped.map(item => canonicalModelName(item.modelName!)));
  for (const item of chart.items.filter(item => !mappings.has(item.name!))) {
    assert.ok(mappedModels.has(canonicalModelName(item.modelName ?? item.name!.replace(/^.* - /, ""))), item.name);
  }

  await run();
  const dataset = await readDataset();
  const atlas = dataset.evaluations.find(evaluation => evaluation.id === id);
  assert.ok(atlas);
  assert.equal(atlas.slug, id);
  assert.equal(atlas.display_name, "SWE-Atlas-QnA");
  assert.equal(atlas.source_url, "https://artificialanalysis.ai/agents/coding-agents");
  assert.equal(atlas.score_kind, "percentage");
  assert.equal(atlas.score_unit, "%");
  assert.equal(atlas.row_count, rowCount);
  assert.match(atlas.notes, /Scored inside the coding agent AA ran each model in.*Ranks compare the model configurations included on this leaderboard/);
  assert.equal(dataset.snapshots.find(snapshot => snapshot.id === atlas.published_snapshot_id)?.row_count, atlas.row_count);
  assert.deepEqual(dataset.evaluations.filter(evaluation => evaluation.id !== id), baseline.evaluations);
  assert.deepEqual(dataset.entries.filter(entry => entry.evaluation_id !== id), baseline.entries);
  assert.deepEqual(dataset.models, baseline.models);
  assert.deepEqual(dataset.providers, baseline.providers);
  assert.equal(dataset.report.evaluation_count, 20);

  const entries = dataset.entries.filter(entry => entry.evaluation_id === id);
  assert.deepEqual(entries.map(entry => entry.model).sort(), [...mappings.values()].sort());
  for (const entry of entries) {
    assert.equal(entry.score_value, scoresByName.get(entry.model));
    assert.equal(entry.source_rank, 1 + entries.filter(other => other.score_value > entry.score_value).length);
    assert.equal(entry.cost_usd, null);
    assert.equal(entry.cost_status, "missing");
  }
  assert.equal(entries[0].source_rank, 1);
  assert.equal(entries[0].score_value, Math.max(...scoresByName.values()));
  const carbon = entries.find(entry => entry.model === "Gemini 4 Carbon (High)")!;
  const fable = entries.find(entry => entry.model === "Claude Fable 5.2 (Adaptive Reasoning, Medium Effort, Default Fallback)")!;
  assert.equal(carbon.score_value, fable.score_value);
  assert.equal(carbon.source_rank, fable.source_rank);
  assert.equal(entries.find(entry => entry.score_value < carbon.score_value)?.source_rank, carbon.source_rank + 2);
  assert.equal(Math.round(entries.find(entry => entry.model === "GPT-6.2 Sol (Xhigh)")!.score_value), 51);

  const before = aggregateMaster(baseline.evaluations, baseline.entries).rows;
  // Put the new evaluation first to exercise master identity and sorting independently of catalog order.
  const master = aggregateMaster([atlas, ...baseline.evaluations], dataset.entries).rows;
  assert.equal(master.length, before.length);
  assert.equal(master.filter(row => row.cells[id]).length, rowCount);
  const neon = master.find(row => row.provider === "Google" && row.model === "Gemini 4 Neon (Xhigh)");
  assert.equal(neon?.cells[id]?.entry.score_value, 0.67741935483871 * 100);
  assert.deepEqual(sortMaster(master, "aggregate-score", "asc").map(row => row.identity_key),
    sortMaster(before, "aggregate-score", "asc").map(row => row.identity_key));
  for (const [index, row] of master.entries()) {
    assert(!mappings.has(row.model), row.model);
    const { [id]: atlasCell, ...otherCells } = row.cells;
    assert.deepEqual(otherCells, before[index].cells, row.model);
    assert.equal(row.identity_key, before[index].identity_key);
    assert.equal(row.model_id, before[index].model_id);
    assert.equal(row.source_rank, before[index].source_rank);
    assert.deepEqual(averageMasterRank(row), averageMasterRank(before[index]), row.model);
    if (atlasCell) assert.equal(new URL(atlasCell.href, "https://example.com").searchParams.get("q"), row.model);
  }
  const csvHeader = masterLeaderboardCsv(masterTableRows(master), dataset.evaluations).split("\n")[0];
  assert.match(csvHeader, /FrontierCode 2\.0,SWE-Atlas QnA,/);

  const planner = buildPlannerData(dataset.evaluations, dataset.entries);
  const scores = calculateSuitability({ ...planner, weights: [
    { evaluation_id: id, weight: 100, captured_at: atlas.captured_at, snapshot_id: atlas.published_snapshot_id },
  ] });
  assert.equal(scores[0].model, entries[0].model);
  assert.equal(scores.filter(score => score.complete_coverage).length, rowCount);
  assert(scores.slice(rowCount).every(score => score.score === null && score.coverage_percent === 0));

  const outputs = [datasetPath, join(data, "intelligence-index-costs.json")];
  const readOutputs = () => Promise.all(outputs.map(path => readFile(path, "utf8")));
  const saved = await readOutputs();
  const modificationTimes = () => Promise.all(outputs.map(async path => (await stat(path, { bigint: true })).mtimeNs));
  const savedTimes = await modificationTimes();
  await run();
  assert.deepEqual(await readOutputs(), saved);
  assert.deepEqual(await modificationTimes(), savedTimes);

  const items = chart.items;
  const target = items.find(item => item.name === "Codex - GPT-6.2 Sol (Xhigh)")!;
  const kimi = items.find(item => item.name === "Kimi Code CLI - Kimi K3.1 Pro")!;
  const longName = `A new model ${"with a long name ".repeat(25).trim()}`;
  const unmapped = { id: "extra-setup", name: `Extra agent - ${longName}`, modelName: longName, creatorName: "Extra", value: 1 };
  const otherKimi = { ...kimi, id: "kimi-other", name: "Other agent - Kimi K3.1 Pro (Max)", modelName: "Kimi K3.1 Pro (Max)" };
  const withTarget = (changes: Partial<AtlasItem>) => items.map(item => item === target ? { ...item, ...changes } : item);
  const setCapture = (next: AtlasItem[]) => writeFile(capturePath, JSON.stringify({
    ...capture, charts: capture.charts.map(item => item === chart ? { ...chart, items: next } : item),
  }));
  const invalid = [
    { next: [...withTarget({ name: `Other agent - ${target.modelName}` }), unmapped], error: /missing expected AA setups: Codex - GPT-6\.2 Sol \(Xhigh\)/ },
    { next: [...items, { ...target, id: unmapped.id, name: target.name.toLowerCase() }], error: /duplicate AA setup/ },
    { next: [...items, { ...unmapped, id: target.id.toUpperCase() }], error: /duplicate AA setup/ },
    { next: [...items, { ...unmapped, name: " " }], error: /missing AA setup name or ID/ },
    // Two mapped setups may never claim one model and effort; the second one stops the import.
    { next: [...items.filter(item => item !== target), { ...target, modelName: "GPT-6.2 Sol (Max)", effort: "max" }], error: /duplicate model and effort/ },
    { next: withTarget({ modelName: " " }), error: /unexpected model name/ },
    { next: withTarget({ creatorName: "Extra" }), error: /no master row for "GPT-6\.2 Sol \(Xhigh\)"/ },
    { next: withTarget({ value: null }), error: /invalid value for GPT-6\.2 Sol/ },
    { next: withTarget({ value: 1.01 }), error: /invalid value for GPT-6\.2 Sol/ },
  ];
  for (const { next, error } of invalid) {
    await setCapture(next);
    await assert.rejects(run, error);
    assert.deepEqual(await readOutputs(), saved);
  }
  await writeFile(capturePath, captureText);
  await run();
  assert.deepEqual(await readOutputs(), saved);

  // AA runs some models in several agents; a mapped model's other-agent setups are skipped, even with a higher score.
  const otherAgents = [
    { ...target, id: unmapped.id, name: `Other agent - ${target.modelName}`, modelName: target.modelName.toLowerCase(), value: 1 },
    { ...otherKimi, value: 1 },
  ];
  const atlasRows = async () => (await readDataset()).entries.filter(entry => entry.evaluation_id === id)
    .map(entry => [entry.model, entry.score_value, entry.source_rank].join("|")).sort();
  const rowsBefore = await atlasRows();
  await setCapture([...items, ...otherAgents]);
  const skipped = await run();
  for (const setup of otherAgents) assert.ok(skipped.stderr.includes(`skipping unmapped AA setup "${setup.name}"`));
  assert.deepEqual(await atlasRows(), rowsBefore);
  // Import a changed capture with an unmapped score higher than rank 1, including concurrent writes.
  const kimiHigh = { ...otherKimi, name: "Other agent - Kimi K3.1 Pro (High)", modelName: "Kimi K3.1 Pro", effort: "high" };
  await setCapture([...items, unmapped, kimiHigh]);
  const runs = await Promise.all([run(), run()]);
  for (const result of runs) {
    assert.ok(result.stderr.includes(`skipping unmapped AA setup "${unmapped.name}"`));
    assert.ok(result.stderr.includes(`skipping unmapped AA setup "${kimiHigh.name}"`));
  }
  const refreshed = await readDataset();
  const refreshedEntries = refreshed.entries.filter(entry => entry.evaluation_id === id);
  assert.deepEqual(refreshedEntries.map(({ model, source_rank, score_value }) => [model, source_rank, score_value]),
    entries.map(({ model, source_rank, score_value }) => [model, source_rank, score_value]));
  assert.equal(refreshed.evaluations.find(evaluation => evaluation.id === id)?.row_count, rowCount);
  // The bundled capture, the other-agent capture above and this one.
  assert.equal(refreshed.sourceAssets?.filter(asset => asset.filename === `aa-captures/${id}.json`).length, 3);
  assert((await readdir(data)).every(file => !file.endsWith(".tmp")));
});
