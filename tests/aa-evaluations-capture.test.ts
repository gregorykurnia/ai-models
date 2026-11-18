import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readBenchmarkItems } from "../scripts/capture-aa-evaluations.mjs";

const seriesKey = "swe-atlas-qna";
const setup = (id: string, displayLabel: string, meanReward: unknown = 0.65) => ({
  row: { id, displayLabel, indexScore: 0.82 },
  components: [
    { key: "frontiercode-v2.0", meanReward: 0.71 },
    { key: "terminal-bench-v4", meanReward: 0.93 },
    { key: seriesKey, meanReward },
  ],
});

function read(items: unknown[], chartSeries = seriesKey) {
  return readBenchmarkItems({
    __reactFiberFixture: {
      memoizedProps: { data: [{ id: "chart-geometry", value: 82 }] },
      return: { memoizedProps: { items, legends: [{ id: chartSeries }] } },
    },
  }, seriesKey);
}

test("captures the SWE-Atlas-QnA fraction from the breakdown, including zero and long setup labels", () => {
  const longName = "Coding team with a long name ".repeat(25).trim();
  const model = setup("b", longName, 0);
  const rows = read([
    {
      ...model,
      row: {
        ...model.row, agentCreator: { name: "Maker" }, modelCreators: [{ name: "Maker" }],
        model: { name: "Model (Max)", effort: { slug: "max" } },
      },
    },
    setup("a", "Agent A"),
  ]);
  assert.deepEqual(rows[0], {
    id: "b", name: longName, value: 0, agentCreator: "Maker", creatorName: "Maker", modelName: "Model (Max)", effort: "max",
  });
  assert.equal(rows[1].value, 0.65);
});

test("rejects missing, ambiguous, or invalid SWE-Atlas-QnA entries", () => {
  const row = setup("a", "Agent A");
  assert.throws(() => read([row], "terminal-bench-v4"), /missing "swe-atlas-qna" series/);
  assert.throws(() => read([{ ...row, components: row.components.slice(0, 2) }]), /one valid "swe-atlas-qna" score/);
  assert.throws(() => read([{ ...row, components: [...row.components, row.components[2]] }]), /one valid "swe-atlas-qna" score/);
  for (const value of [null, "", "0.65", NaN, -0.1, 1.01]) {
    assert.throws(() => read([setup("a", "Agent A", value)]), /one valid "swe-atlas-qna" score/);
  }
  for (const blank of [setup(" ", "Agent A"), setup("a", " "), { components: row.components }]) {
    assert.throws(() => read([blank]), /missing setup ID or name/);
  }
  for (const duplicate of [setup("A", "Other agent"), setup("b", " agent a ")]) {
    assert.throws(() => read([row, duplicate]), /duplicate setup/);
  }
});

test("capture CLI names selection failures and timeouts while preserving the last capture and refusing overlapping writers", async t => {
  const cwd = await mkdtemp(join(tmpdir(), "aa-evaluations-capture-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const out = join(cwd, "data", "aa-captures");
  await mkdir(out, { recursive: true });
  const saved = join(out, "swe-atlas-qna-aa.json");
  const lock = join(out, ".swe-atlas-qna-aa.lock");
  await writeFile(saved, "previous capture");
  const playwright = join(cwd, "playwright.mjs");
  await writeFile(playwright, `
    import assert from "node:assert/strict";
    const locators = {
      '[id="panel"]': { locator(selector) {
        if (selector === ".recharts-wrapper") return { async waitFor() {} };
        assert.equal(selector, "button[aria-controls]");
        return { filter: () => ({ evaluateAll: async () => ["models"] }) };
      } },
      'button[aria-controls="models"]': { evaluateAll: async () => "1 of 2 models", async click() {} },
      '[id="models"]': { getByText(name) {
        assert.equal(name, "Select all");
        return { async click() { throw new Error("Select all control disappeared"); } };
      } },
    };
    export const chromium = { async launch() { return {
      async newPage() { return {
        async goto(url) {
          assert.equal(url, "https://artificialanalysis.ai/agents/coding");
          if (process.env.AA_CAPTURE_TEST_FAULT === "timeout") throw new Error("navigation timed out");
          return { ok: () => true };
        },
        async waitForTimeout() {},
        getByRole(role, {name}) {
          assert.equal(role, "tab");
          assert.equal(name, "Score by Benchmark");
          return { async click() {}, async getAttribute() { return "panel"; } };
        },
        locator(selector) { return locators[selector]; },
      }; },
      async close() {},
    }; } };
  `);
  const script = fileURLToPath(new URL("../scripts/capture-aa-evaluations.mjs", import.meta.url));
  const run = (args: string[], fault = "timeout") => promisify(execFile)(process.execPath, [script, ...args], {
    cwd, env: { ...process.env, PLAYWRIGHT_MODULE: playwright, AA_CAPTURE_ONLY: "frontiercode-2-0", AA_CAPTURE_TEST_FAULT: fault },
  });

  await assert.rejects(run(["--only"]), /argument missing/);
  await assert.rejects(run(["--only", "unknown"]), /Unknown capture key/);
  const only = ["--only", "swe-atlas-qna-aa"];
  await writeFile(lock, "other writer");
  await assert.rejects(run(only), /swe-atlas-qna-aa: capture is already running/);
  assert.equal(await readFile(lock, "utf8"), "other writer");
  assert.equal(await readFile(saved, "utf8"), "previous capture");
  await rm(lock);
  for (const [fault, error] of [
    ["select-all", /swe-atlas-qna-aa: failed to select all models in selector 1 \(1 of 2 models\)/],
    ["timeout", /swe-atlas-qna-aa: navigation timed out/],
  ] as const) {
    await assert.rejects(run(only, fault), error);
    assert.equal(await readFile(saved, "utf8"), "previous capture");
    assert.deepEqual(await readdir(out), ["swe-atlas-qna-aa.json"]);
  }
});
