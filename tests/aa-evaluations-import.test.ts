import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import type { Dataset } from "../src/lib/contract";

const execFileAsync = promisify(execFile);

test("AA import reads renamed FrontierCode score and cost charts, stays repeatable, and rejects bad captures", async t => {
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
  await run();
  assert.deepEqual(await Promise.all(outputs.map(file => readFile(join(data, file), "utf8"))), saved);
});
