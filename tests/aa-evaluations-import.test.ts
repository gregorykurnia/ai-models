import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test, type TestContext } from "node:test";
import { assertCompleteScoreChart } from "../scripts/capture-aa-evaluations.mjs";
import type { Dataset } from "../src/lib/contract";
import { aggregateMaster, averageMasterRank, masterLeaderboardCsv, masterTableRows, orderMasterEvaluations, sortMaster } from "../src/lib/master";
import { calculateSuitability } from "../src/lib/suitability";
import { buildPlannerData } from "../src/lib/suitability-data";

const execFileAsync = promisify(execFile);

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
type AtlasCapture = { charts: { title: string; items: AtlasItem[] }[] };

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
  const inventory = await readFile(new URL("../docs/SWE_ATLAS_QNA_CAPTURE.md", import.meta.url), "utf8");
  const mappings = new Map(inventory.split("\n").flatMap(line => {
    const [, setup, score, model] = line.split("|").map(cell => cell.trim());
    return line.startsWith("| ") && score?.endsWith("%") && model ? [[setup, model] as const] : [];
  }));
  const scoresByName = new Map(chart.items.map(item => [mappings.get(item.name), item.value! * 100]));
  assert.equal(scoresByName.size, 39);
  assert(!scoresByName.has(undefined));

  await run();
  const dataset = await readDataset();
  const atlas = dataset.evaluations.find(evaluation => evaluation.id === id);
  assert.ok(atlas);
  assert.equal(atlas.slug, id);
  assert.equal(atlas.display_name, "SWE-Atlas-QnA");
  assert.equal(atlas.source_url, "https://artificialanalysis.ai/agents/coding-agents");
  assert.equal(atlas.score_kind, "percentage");
  assert.equal(atlas.score_unit, "%");
  assert.equal(atlas.row_count, 39);
  assert.match(atlas.notes, /Scored inside the coding agent AA ran each model in.*Ranks compare the model configurations included on this leaderboard/);
  assert.equal(dataset.snapshots.find(snapshot => snapshot.id === atlas.published_snapshot_id)?.row_count, atlas.row_count);
  assert.deepEqual(dataset.evaluations.filter(evaluation => evaluation.id !== id), baseline.evaluations);
  assert.deepEqual(dataset.entries.filter(entry => entry.evaluation_id !== id), baseline.entries);
  assert.deepEqual(dataset.models, baseline.models);
  assert.deepEqual(dataset.providers, baseline.providers);
  assert.equal(dataset.report.evaluation_count, 19);

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
  assert.equal(master.filter(row => row.cells[id]).length, 39);
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
  assert.equal(scores.filter(score => score.complete_coverage).length, 39);
  assert(scores.slice(39).every(score => score.score === null && score.coverage_percent === 0));

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
    { next: [...items, { ...target, id: unmapped.id, name: `Other agent - ${target.modelName}`, modelName: target.modelName.toLowerCase() }], error: /duplicate model and effort/ },
    { next: [...items, otherKimi], error: /duplicate model and effort/ },
    { next: [...items, { ...unmapped, id: target.id.toUpperCase() }], error: /duplicate AA setup/ },
    { next: [...items, { ...unmapped, name: " " }], error: /missing AA setup name or ID/ },
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
  assert.equal(refreshed.evaluations.find(evaluation => evaluation.id === id)?.row_count, 39);
  assert.equal(refreshed.sourceAssets?.filter(asset => asset.filename === `aa-captures/${id}.json`).length, 2);
  assert((await readdir(data)).every(file => !file.endsWith(".tmp")));
});
