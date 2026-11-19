import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import capture from "../data/aa-captures/aa-personalitybench.json";
import { assertCompletePersonalitySelection, capturePersonalityBench } from "../scripts/capture-aa-personalitybench.mjs";
import { importPersonalityBench } from "../scripts/import-aa-personalitybench";
import type { Dataset } from "../src/lib/contract";
import { aggregateMaster, masterIdentityKey } from "../src/lib/master";
import { getPersonalityDataset } from "../src/lib/personality";

const masterFile = new URL("../data/leaderboards.json", import.meta.url);
const inventoryFile = new URL("../docs/AA_PERSONALITYBENCH_CAPTURE.md", import.meta.url);
const noMaster = new Map();
const execFileAsync = promisify(execFile);

function fixture() {
  return {
    ...structuredClone(capture),
    selector: "1 of 1 models",
    models: [{
      id: "fixture",
      name: "Example Model",
      creator: { name: "Example Provider" },
      judged: {
        indexScores: { warmth: 1.25 },
        ranks: { sincere: 80.96 },
        scores: { sincere: 1283.2 },
        cis: { sincere: { lower: 1268, upper: 1317 } },
      },
    }],
  };
}

test("bundled PersonalityBench data and inventory match the complete capture and master", async () => {
  const master = JSON.parse(await readFile(masterFile, "utf8")) as Dataset;
  const { rows } = aggregateMaster(master.evaluations, master.entries);
  const masterByIdentity = new Map(rows.map(row => [row.identity_key, row]));
  const { dataset, inventory } = importPersonalityBench(capture, masterByIdentity);
  assert.deepEqual(getPersonalityDataset(), dataset);
  assert.equal(await readFile(inventoryFile, "utf8"), inventory);
  assert.equal(dataset.captured_at, capture.captured_at);
  assert.equal(dataset.source_url, capture.source_url);
  assert.equal(capture.selector, `${dataset.models.length} of ${dataset.models.length} models`);
  assert.equal(new Set(dataset.models.map(model => model.identity_key)).size, dataset.models.length);
  assert.deepEqual(dataset.indexes.map(index => index.key), [
    "expressiveness", "organization", "informativeness", "transparency", "warmth", "conviction", "imagination", "slop",
  ]);
  assert.deepEqual(dataset.indexes.map(index => index.traits.map(trait => trait.key)), capture.index_cards.map(card => card.traits));
  const traits = dataset.indexes.flatMap(index => index.traits);
  assert.equal(new Set(traits.map(trait => trait.key)).size, 30);
  assert.deepEqual(traits.filter(trait => trait.lower_is_better).map(trait => trait.key), ["sycophantic", "slop"]);
  assert.equal(traits.find(trait => trait.key === "constructivelyPushesBack")?.source_url,
    `${capture.source_url}/traits/constructively-pushes-back`);
  assert.equal(dataset.indexes.reduce((sum, index) => sum + index.question_count, 0), 900);

  for (const family of ["Claude Fable 5.2", "GPT-6.2 Astra", "GPT-6.2 Sol"]) {
    const variants = capture.models.filter(model => model.name.startsWith(family));
    assert.ok(variants.length, `no ${family} variants in capture`);
    for (const source of variants) {
      const key = masterIdentityKey(source.creator.name, source.name);
      const match = masterByIdentity.get(key);
      assert.ok(match, `no master row for ${source.name}`);
      const model = dataset.models.find(candidate => candidate.identity_key === match.identity_key);
      assert.equal(model?.name, match.model);
      assert.equal(model?.provider, match.provider);
    }
  }
});

test("index cards and trait definitions reject taxonomy changes", () => {
  const input = fixture();
  const warmth = input.index_cards.find(card => card.key === "warmth")!;
  warmth.traits[2] = "confident";
  assert.throws(() => importPersonalityBench(input, noMaster), /index warmth traits changed.*sincere.*confident/);

  const { sincere, ...remaining } = fixture().traits;
  const changed = { ...fixture(), traits: { ...remaining, unexpectedTrait: sincere } };
  assert.throws(() => importPersonalityBench(changed, noMaster), /trait definitions changed.*missing: sincere.*extra: unexpectedTrait/);
});

test("model identities reject aliases of the same model and blank labels", () => {
  const input = fixture();
  const first = input.models[0];
  first.name = "Claude Fable 5.2 (High, Default Fallback)";
  first.creator.name = "Anthropic";
  input.models.push({
    ...first, id: "second", creator: { name: " anthropic " },
    name: "claude fable 5.2 (adaptive reasoning, high effort, default fallback)",
  });
  input.selector = "2 of 2 models";
  assert.throws(() => importPersonalityBench(input, noMaster), /Duplicate PersonalityBench identity.*Fable 5\.2/);

  const blank = fixture();
  blank.models[0].creator.name = " ";
  assert.throws(() => importPersonalityBench(blank, noMaster), /creator/);
});

test("scores retain unrounded and missing values and reject invalid metrics", () => {
  const input = fixture();
  const longName = "Example | ".repeat(120) + "Model";
  input.models[0].name = longName;
  const { dataset, inventory } = importPersonalityBench(input, noMaster);
  const [model] = dataset.models;
  assert.equal(model.name, longName);
  assert.equal(model.provider, input.models[0].creator.name);
  assert.equal(model.index_percentiles.warmth, 1.25);
  assert.equal(model.index_percentiles.slop, null);
  assert.deepEqual(model.traits.sincere, { percentile: 80.96, elo: 1283.2, elo_interval: { lower: 1268, upper: 1317 } });
  assert.deepEqual(model.traits.friendly, { percentile: null, elo: null, elo_interval: null });
  assert.match(inventory, /Example \\\| /);
  assert.match(inventory, /\| No \| .*slop index percentile.*friendly Elo interval/);

  const bad = fixture();
  bad.models[0].judged.ranks.sincere = 100.01;
  assert.throws(() => importPersonalityBench(bad, noMaster), /ranks/);
  bad.models[0].judged.ranks.sincere = 1;
  bad.models[0].judged.indexScores.warmth = 0;
  assert.throws(() => importPersonalityBench(bad, noMaster), /indexScores/);
  bad.models[0].judged.indexScores.warmth = 1;
  bad.models[0].judged.cis.sincere.lower = 1300;
  assert.throws(() => importPersonalityBench(bad, noMaster), /invalid Elo interval for sincere/);
});

test("partial selectors and missing judged records fail with the AA page URL", () => {
  for (const label of ["1 of 2 models", "all models", "2 of 2 models"]) {
    assert.throws(() => assertCompletePersonalitySelection(label, 1), error =>
      error instanceof Error && error.message.startsWith(`${capture.source_url}: incomplete model selection`));
  }
  const input = { ...fixture(), selector: "2 of 2 models" };
  assert.throws(() => importPersonalityBench(input, noMaster), /aa-personalitybench: incomplete model selection.*1 judged records/);
});

test("capture reports an interrupted page load with the AA page URL", async () => {
  const page = {
    goto: async (url: string) => {
      assert.equal(url, capture.source_url);
      throw new Error("page closed while loading");
    },
  };
  await assert.rejects(() => capturePersonalityBench(page), { message: `${capture.source_url}: page closed while loading` });
});

test("CLI imports are idempotent, recover after staging fails, and refuse overlapping writers", async t => {
  const directory = await mkdtemp(join(tmpdir(), "aa-personalitybench-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const data = join(directory, "data");
  const captures = join(data, "aa-captures");
  const docs = join(directory, "docs");
  await mkdir(captures, { recursive: true });
  await mkdir(docs);
  const capturePath = join(captures, "aa-personalitybench.json");
  const outputPath = join(data, "aa-personalitybench.json");
  const inventoryPath = join(docs, "AA_PERSONALITYBENCH_CAPTURE.md");
  const lockPath = join(data, ".aa-personalitybench.lock");
  const run = () => execFileAsync(process.execPath, [
    "--import", import.meta.resolve("tsx"),
    fileURLToPath(new URL("../scripts/import-aa-personalitybench.ts", import.meta.url)),
  ], { cwd: directory });

  const input = fixture();
  await copyFile(masterFile, join(data, "leaderboards.json"));
  await writeFile(capturePath, JSON.stringify(input));
  await run();
  const paths = [outputPath, inventoryPath];
  const original = await Promise.all(paths.map(path => readFile(path, "utf8")));
  const before = await Promise.all(paths.map(path => stat(path)));
  await run();
  const after = await Promise.all(paths.map(path => stat(path)));
  assert.deepEqual(after.map(file => [file.ino, file.mtimeMs]), before.map(file => [file.ino, file.mtimeMs]));

  input.selector = "1 of 2 models";
  await writeFile(capturePath, JSON.stringify(input));
  await assert.rejects(run, /incomplete model selection/);
  assert.deepEqual(await Promise.all(paths.map(path => readFile(path, "utf8"))), original);

  input.selector = "1 of 1 models";
  input.models[0].judged.ranks.sincere = 81.23;
  await writeFile(capturePath, JSON.stringify(input));
  await writeFile(lockPath, `${process.pid}\n`);
  await assert.rejects(run, /capture or import is already running/);
  assert.equal(await readFile(lockPath, "utf8"), `${process.pid}\n`);
  assert.deepEqual(await Promise.all(paths.map(path => readFile(path, "utf8"))), original);
  await rm(lockPath);

  const backup = `${inventoryPath}.backup`;
  await rename(inventoryPath, backup);
  await mkdir(inventoryPath);
  await assert.rejects(run, /EISDIR/);
  assert.equal(await readFile(outputPath, "utf8"), original[0]);
  assert.ok(!(await readdir(data)).some(name => name.endsWith(".tmp") || name.endsWith(".lock")));
  await rm(inventoryPath, { recursive: true });
  await rename(backup, inventoryPath);
  await run();
  const updated = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(updated.models[0].traits.sincere.percentile, 81.23);
});
