import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { evaluationTimingSources, type TimingCapture } from "../scripts/aa-speed-sources";

const exec = promisify(execFile);
const script = new URL("../scripts/import-aa-intelligence-index-costs.ts", import.meta.url).href;
const outputs = ["intelligence-index-costs.json", "aa-model-speed.json"];

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), "aa-speed-import-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "data"));
  const models = [
    { id: "max-id", slug: "family", name: "Family (Max)", creator: { name: "Test" },
      intelligenceIndexTimePerTask: 600, intelligenceIndexCostPerTask: { cost: { total: 1 } }, headline: { timeToFirstAnswerToken: 12 } },
    { id: "low-id", slug: "family-low", name: "Family (Low)", creator: { name: "Test" }, headline: { timeToFirstAnswerToken: 0 } },
  ];
  const capture: TimingCapture = { format_version: 1, unit_evidence: { source_url: "https://artificialanalysis.ai/_next/static/fixture.js", captured_at: new Date().toISOString(), sha256: "a".repeat(64), excerpt: "evalTimePerTask getToolMsPerTask /1e3" }, evaluations: evaluationTimingSources.map(source => ({
    evaluation_slug: source.slug, source_url: source.url, captured_at: new Date().toISOString(),
    title: `${source.slug}: Time per Task`, unit: "seconds", metric_path: "EvaluationDataProvider.selectedModels[].evalTimePerTask", time_chart_present: true, selected_model_count: 2,
    selector: "2 of 2 models", items: [
      { id: "max-id", name: "Family (Max)", url: "/models/family", seconds: 2.123456789 },
      { id: "low-id", name: "Family (Low)", url: "/models/family", seconds: 0 },
    ],
  })) };
  const save = () => writeFile(join(directory, "data/aa-speed-captures.json"), JSON.stringify(capture));
  await save();
  for (const file of outputs) await writeFile(join(directory, "data", file), "verified output\n");
  const read = () => Promise.all(outputs.map(file => readFile(join(directory, "data", file), "utf8")));
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = (options: { fail?: boolean; noAnswer?: boolean; delay?: number; stageFailure?: boolean } = {}) => {
    const flight = `"manifest":${JSON.stringify({ path: "/models.json" })}`;
    const html = `self.__next_f.push([1,${JSON.stringify(flight)}])`;
    return exec(process.execPath, ["--import", import.meta.resolve("tsx"), "--input-type=module", "--eval", `
      ${options.noAnswer ? "const timeout = AbortSignal.timeout; AbortSignal.timeout = () => timeout(20);" : ""}
      globalThis.fetch = async (url, options) => {
        if (String(url).endsWith('/models.json')) {
          ${options.fail ? "throw new Error('manifest unavailable');" : ""}
          ${options.noAnswer ? "return new Promise((resolve, reject) => { const alive = setTimeout(() => {}, 1000); options.signal.addEventListener('abort', () => { clearTimeout(alive); reject(options.signal.reason); }); });" : ""}
          ${options.delay ? `await new Promise(resolve => setTimeout(resolve, ${options.delay}));` : ""}
          return new Response(${JSON.stringify(JSON.stringify({ models }))});
        }
        return new Response(${JSON.stringify(html)});
      };
      ${options.stageFailure ? "await (await import('node:fs/promises')).mkdir('data/aa-model-speed.json.' + process.pid + '.tmp');" : ""}
      await import(${JSON.stringify(script)});
    `], { cwd: directory, env });
  };
  return { directory, models, capture, save, read, run };
}

test("manifest timing import joins exact IDs despite shared family URLs and retains precise seconds and provenance", async t => {
  const f = await fixture(t);
  f.models[1].name = `Family (Low) ${"long name ".repeat(100)}`;
  await f.run();
  const [costText, speedText] = await f.read();
  const costs = JSON.parse(costText);
  const speeds = JSON.parse(speedText);
  assert.equal(costs.cost_count, 1);
  assert.equal(speeds.speed_count, 2);
  assert.equal(speeds.evaluation_time_count, 2);
  const max = speeds.records.find((record: { slug: string }) => record.slug === "family");
  const low = speeds.records.find((record: { slug: string }) => record.slug === "family-low");
  assert.equal(max.time_per_task_s, 600);
  assert.equal(low.time_per_task_s, null);
  assert.equal(low.first_answer_s, 0);
  assert.equal(low.name, f.models[1].name);
  for (const source of evaluationTimingSources) {
    assert.equal(max.evaluation_times_s[source.slug], 2.123456789);
    assert.equal(low.evaluation_times_s[source.slug], 0);
    const evidence = speeds.sources[max.provenance.evaluation_times_s[source.slug]];
    assert.equal(evidence.source_url, source.url);
    assert.equal(evidence.captured_at, f.capture.evaluations.find(chart => chart.evaluation_slug === source.slug)!.captured_at);
  }
  assert.ok(speeds.sources[max.provenance.time_per_task_s]);
  assert.ok(speeds.sources[low.provenance.first_answer_s]);
  await f.run();
  const retry = JSON.parse((await f.read())[1]);
  assert.deepEqual(retry.records.map(({ captured_at, ...record }: { captured_at: string }) => record),
    speeds.records.map(({ captured_at, ...record }: { captured_at: string }) => record));
});

test("missing, stale, empty, duplicate, unknown and invalid timing captures preserve both verified outputs", async t => {
  const f = await fixture(t);
  const before = await f.read();
  const original = structuredClone(f.capture);
  const badCaptures: Array<(capture: TimingCapture) => void> = [
    capture => { capture.evaluations.pop(); },
    capture => { capture.evaluations[0].captured_at = "2026-01-01T00:00:00Z"; },
    capture => { capture.evaluations[0].items = []; },
    capture => { capture.evaluations[0].selector = "1 of 2 models"; },
    capture => { capture.evaluations[0].selected_model_count = 1; },
    capture => { capture.evaluations[0].items.push({ ...capture.evaluations[0].items[0], id: "MAX-ID" }); },
    capture => { capture.evaluations[0].items[0].id = "unknown-id"; },
    capture => { capture.evaluations[0].items[0].seconds = -1; },
    capture => { capture.evaluations[0].items[0].seconds = Number.POSITIVE_INFINITY; },
    capture => { capture.evaluations[0].items[0].id = " "; },
    capture => { capture.evaluations[0].items[0].name = " "; },
    capture => { capture.evaluations.push(capture.evaluations[0]); },
    capture => { capture.evaluations[0].source_url = "https://example.com"; },
    capture => { capture.unit_evidence.captured_at = "2026-01-01T00:00:00Z"; },
  ];
  for (const change of badCaptures) {
    Object.assign(f.capture, structuredClone(original));
    change(f.capture);
    await f.save();
    await assert.rejects(f.run());
    assert.deepEqual(await f.read(), before);
  }
  await rm(join(f.directory, "data/aa-speed-captures.json"));
  await assert.rejects(f.run());
  assert.deepEqual(await f.read(), before);
});

test("network and staging failures preserve verified files, release the lock, and allow a successful retry", async t => {
  const f = await fixture(t);
  const before = await f.read();
  await assert.rejects(f.run({ fail: true }), /manifest unavailable/);
  assert.deepEqual(await f.read(), before);
  await assert.rejects(f.run({ noAnswer: true }), /TimeoutError/);
  assert.deepEqual(await f.read(), before);
  await assert.rejects(f.run({ stageFailure: true }), /EISDIR/);
  assert.deepEqual(await f.read(), before);
  await f.run();
  assert.equal(JSON.parse((await f.read())[1]).speed_count, 2);
});

test("a concurrent timing import refuses the second writer before it can replace newer data", async t => {
  const f = await fixture(t);
  const first = f.run({ delay: 300 });
  const second = f.run({ delay: 300 });
  const results = await Promise.allSettled([first, second]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const failed = results.find(result => result.status === "rejected") as PromiseRejectedResult;
  assert.match(failed.reason.stderr, /AA speed capture\/import is already running/);
  assert.equal(JSON.parse((await f.read())[1]).speed_count, 2);
});
