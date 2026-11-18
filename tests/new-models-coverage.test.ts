import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, rmdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Dataset } from "../src/lib/contract";

const root = fileURLToPath(new URL("../", import.meta.url));
const base: Dataset = JSON.parse(await readFile(join(root, "data/leaderboards.json"), "utf8"));
const gptReport = "docs/GPT_6_2_ASTRA_SOL_COVERAGE.md";
const hydrogenReport = "docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md";
const run = promisify(execFile);
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
const audit = (cwd: string, ...args: string[]) => run(process.execPath, [
  "--import", import.meta.resolve("tsx"), join(root, "scripts/audit-new-models-coverage.ts"), ...args,
], { cwd, env });

async function workspace(t: TestContext): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "ai-model-coverage-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await Promise.all([mkdir(join(cwd, "docs")), mkdir(join(cwd, "data"))]);
  await Promise.all([
    "aa-captures", "aa-briefcase-components.json", "aa-briefcase-rubric-refresh.json",
    "aa-model-profile-overlays.json", "leaderboards.json",
  ].map(file => symlink(join(root, "data", file), join(cwd, "data", file))));
  return cwd;
}

test("both sets write their own report and GPT-6.2 covers every bundled evaluation", async t => {
  const cwd = await workspace(t);
  const [gpt, hydrogen] = await Promise.all([audit(cwd, "--set", "gpt-6.2"), audit(cwd, "--set", "hydrogen")]);
  assert.match(gpt.stdout, /10 master rows.*145 filled, 15 absent/);
  assert.match(hydrogen.stdout, /7 master rows/);
  const [report, legacyReport] = await Promise.all([
    readFile(join(cwd, gptReport), "utf8"), readFile(join(cwd, hydrogenReport), "utf8"),
  ]);
  const models = ["Astra", "Sol"].flatMap(family =>
    ["Low", "Medium", "High", "Xhigh", "Max"].map(effort => `GPT-6.2 ${family} (${effort})`));
  assert.deepEqual(report.match(/^\| GPT-6\.2 .* \| OpenAI \|$/gm)?.sort(),
    models.map(model => `| ${model} | OpenAI |`).sort());
  assert.match(legacyReport, /\| Source \| Hydrogen Xhigh \| Hydrogen High \| Hydrogen Medium \| Hydrogen Low \| Argon Medium \| Qwen4 Max \|/);
  assert.match(legacyReport, /^\| Gemini 4 Argon \(High\) \| Google \|$/m);

  const lines = report.split("\n").filter(line => /^\|[^|]+\| `[^`]+` \| `[^`]+` \|/.test(line));
  assert.equal(lines.length, base.evaluations.length);
  for (const evaluation of base.evaluations) {
    const line = lines.find(line => line.includes(`| \`${evaluation.id}\` |`));
    assert.ok(line, evaluation.id);
    const cells = line.split("|").slice(5, -1).map(cell => cell.trim());
    assert.equal(cells.length, models.length);
    const asset = base.sourceAssets?.find(asset => asset.id === evaluation.source_asset_id);
    assert.ok(line.includes(`\`data/${asset?.filename}\``), evaluation.id);
    const absent = models.filter((model, index) => {
      const entry = base.entries.find(entry => entry.evaluation_id === evaluation.id && entry.model === model);
      if (entry) {
        assert.equal(cells[index], `${Number(entry.score_value.toPrecision(10))} (#${entry.source_rank})`);
        return false;
      }
      assert.equal(cells[index], `not on AA (captured ${evaluation.captured_at})`);
      return true;
    });
    const expected = evaluation.id === "critpt" ? models : evaluation.id === "mmmu-pro" ? models.slice(5) : [];
    assert.deepEqual(absent, expected, evaluation.id);
  }
  const speedRows = report.match(/^\| GPT-6\.2 .* \| `gpt-6-2-[^`]+` \| \$[\d.]+ \| [\d.]+ \| [\d.]+ \|$/gm);
  assert.equal(speedRows?.length, 10);

  await audit(cwd);
  assert.equal(await readFile(join(cwd, hydrogenReport), "utf8"), legacyReport);
});

test("the audit refuses bad set arguments and unexpected master entries", async t => {
  const cwd = await workspace(t);
  await assert.rejects(audit(cwd, "--set", "gpt-6.1"), { code: 1, stderr: /Usage:/ });
  await assert.rejects(audit(cwd, "--set"), { code: 1, stderr: /Usage:/ });
  const file = join(cwd, "data/leaderboards.json");
  await rm(file);
  const entry = base.entries.find(entry => entry.evaluation_id === "intelligence-index" && entry.model === "GPT-6.2 Sol (Max)")!;
  const cases = [
    { name: "extra long configuration", entries: [...base.entries, { ...entry, model: `GPT-6.2 Sol (${"New".repeat(100)})` }], error: /Master rows matching/ },
    { name: "duplicate with different case", entries: [...base.entries, { ...entry, model: entry.model.toLowerCase() }], error: /duplicate entry/ },
    { name: "blank model", entries: base.entries.map(e => e === entry ? { ...entry, model: "" } : e), error: /cell empty but .* mentions it/ },
    { name: "wrong provider", entries: base.entries.map(e => e === entry ? { ...entry, provider: "Google" } : e), error: /Master rows matching/ },
  ];
  for (const { name, entries, error } of cases) {
    await t.test(name, async () => {
      await writeFile(file, JSON.stringify({ ...base, entries }));
      await assert.rejects(audit(cwd, "--set", "gpt-6.2"), { code: 1, stderr: error });
      assert.deepEqual(await readdir(join(cwd, "docs")), []);
    });
  }
});

test("overlapping reruns preserve the dated live observations", async t => {
  const cwd = await workspace(t);
  await audit(cwd, "--set", "gpt-6.2");
  const file = join(cwd, gptReport);
  const draft = await readFile(file, "utf8");
  assert.match(draft, /Live verification pending/);
  const verified = draft.replace("Live verification pending.", "Verified 2026-11-18.");
  await writeFile(file, verified);
  await Promise.all([audit(cwd, "--set", "gpt-6.2"), audit(cwd, "--set", "gpt-6.2")]);
  assert.equal(await readFile(file, "utf8"), verified);
  assert.deepEqual(await readdir(join(cwd, "docs")), [gptReport.split("/").at(-1)]);
});

test("a failed report replacement cleans up and can be retried", async t => {
  const cwd = await workspace(t);
  const report = join(cwd, hydrogenReport);
  await mkdir(report);
  await assert.rejects(audit(cwd, "--set", "hydrogen"), { code: 1, stderr: /EISDIR.*rename/ });
  assert.deepEqual(await readdir(join(cwd, "docs")), [hydrogenReport.split("/").at(-1)]);
  await rmdir(report);
  await audit(cwd, "--set", "hydrogen");
  assert.match(await readFile(report, "utf8"), /^# Gemini 4 Hydrogen/);
});
