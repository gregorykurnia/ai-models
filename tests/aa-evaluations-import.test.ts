import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import { assertCompleteScoreChart } from "../scripts/capture-aa-evaluations.mjs";
import type { Dataset } from "../src/lib/contract";
import { aggregateMaster, masterLeaderboardCsv, masterTableRows, orderMasterEvaluations } from "../src/lib/master";

const execFileAsync = promisify(execFile);

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
  const directory = await mkdtemp(join(tmpdir(), "ai-models-evaluations-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const data = join(directory, "data");
  await mkdir(join(data, "aa-captures"), { recursive: true });
  for (const file of ["leaderboards.json", "aa-briefcase-components.json", "aa-briefcase-rubric-refresh.json"]) {
    await copyFile(new URL(`../data/${file}`, import.meta.url), join(data, file));
  }
  for (const file of await readdir(new URL("../data/aa-captures/", import.meta.url))) {
    if (file.endsWith(".json")) await copyFile(new URL(`../data/aa-captures/${file}`, import.meta.url), join(data, "aa-captures", file));
  }
  const captureFile = join(data, "aa-captures/frontiercode-2-0.json");
  const capture = JSON.parse(await readFile(captureFile, "utf8"));
  for (const chart of capture.charts) chart.title = chart.title.replace(/^FrontierCode(?:-AA)? 2\.0:/, "FrontierCode-AA 2.0:");
  await writeFile(captureFile, JSON.stringify(capture));
  const scoreChart = capture.charts.find((chart: { title: string }) => chart.title === "FrontierCode-AA 2.0: Score");
  const costChart = capture.charts.find((chart: { title: string }) => chart.title === "FrontierCode-AA 2.0: Score vs. Cost per Task");
  assert.ok(scoreChart?.items.length);
  assert.ok(costChart?.items.length);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = () => execFileAsync(process.execPath, ["--import", import.meta.resolve("tsx"), fileURLToPath(new URL("../scripts/import-aa-evaluations.ts", import.meta.url))], { cwd: directory, env });
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
