import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { newModelNames, newModelsExpectations, readNewModelsDataset } from "../scripts/check-new-models-browser.mjs";

const dataset = await readNewModelsDataset();
const audit = await readFile(new URL("../docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md", import.meta.url), "utf8");

test("browser fixture includes all audit rows and all three merged Briefcase component evaluations", () => {
  const { expected, evaluations } = newModelsExpectations(dataset, audit);
  assert.equal(expected.length, 7);
  assert.equal(evaluations.length, 19);
  assert.equal(evaluations.reduce((sum, { entries }) => sum + entries.filter(entry => newModelNames.includes(entry.model)).length, 0), 99);
  assert.deepEqual(evaluations.find(({ evaluation }) => evaluation.id === "swe-atlas-qna-aa")?.entries.map(entry => entry.model).sort(), [
    "Gemini 4 Argon (High)", "Gemini 4 Hydrogen (Xhigh)",
  ]);
  for (const id of ["aa-briefcase-rubric-score", "aa-briefcase-analytical-quality-elo", "aa-briefcase-presentation-elo"]) {
    assert.equal(evaluations.find(({ evaluation }) => evaluation.id === id)?.entries.length, 7);
  }
  assert.equal(evaluations.find(({ evaluation }) => evaluation.id === "critpt")?.entries.filter(entry => newModelNames.includes(entry.model)).length, 1);
  for (const id of ["critpt-v2-full", "critpt-v2-hard"]) {
    assert.equal(evaluations.find(({ evaluation }) => evaluation.id === id)?.entries.filter(entry => newModelNames.includes(entry.model)).length, 6);
  }
});

test("browser fixture follows source rank when capture rows are in a different order", () => {
  const { evaluations } = newModelsExpectations(dataset, audit);
  for (const [id, rank] of [["aa-briefcase-analytical-quality-elo", 7], ["aa-briefcase-presentation-elo", 10]] as const) {
    const briefcase = evaluations.find(({ evaluation }) => evaluation.id === id)!;
    assert.equal(briefcase.entries[0].model, "Qwen4 Max");
    assert.equal(briefcase.entries[0].source_rank, rank);
  }
});

test("browser fixture rejects a missing or blank model even when the rest of the evaluation is populated", () => {
  const missing = structuredClone(dataset);
  missing.entries = missing.entries.filter(entry => !(entry.evaluation_id === "intelligence-index" && entry.model === "Qwen4 Max"));
  assert.throws(() => newModelsExpectations(missing, audit), /intelligence-index: Qwen4 Max absence agrees with audit/);
  const blank = structuredClone(dataset);
  blank.entries.find(entry => entry.evaluation_id === "intelligence-index" && entry.model === "Qwen4 Max")!.model = "";
  assert.throws(() => newModelsExpectations(blank, audit), /intelligence-index: Qwen4 Max absence agrees with audit/);
});

test("browser fixture rejects duplicate entries and alternate spelling or case", () => {
  const duplicate = structuredClone(dataset);
  const original = duplicate.entries.find(entry => entry.evaluation_id === "intelligence-index" && entry.model === "Qwen4 Max")!;
  duplicate.entries.push({ ...original, id: original.id + "-duplicate" });
  assert.throws(() => newModelsExpectations(duplicate, audit), /intelligence-index: duplicate Qwen4 Max/);
  for (const model of ["Qwen 4 Max", "qwen4 max", "Gemini 4 Hydrogen (Very Long Unknown Effort)"]) {
    const alternate = structuredClone(dataset);
    alternate.entries.push({ ...original, model });
    assert.throws(() => newModelsExpectations(alternate, audit), /hydrogen: exact canonical family variants/);
  }
});

test("browser fixture rejects the right name attached to the wrong provider", () => {
  const wrong = structuredClone(dataset);
  wrong.entries.find(entry => entry.evaluation_id === "intelligence-index" && entry.model === "Qwen4 Max")!.provider = "Google";
  assert.throws(() => newModelsExpectations(wrong, audit), /intelligence-index: Qwen4 Max provider/);
});

test("browser fixture fails on an omitted evaluation or a stale audited rank", () => {
  assert.throws(() => newModelsExpectations(dataset, audit.split("\n").filter(line => !line.startsWith("| CritPt |")).join("\n")), /audit covers every bundled evaluation/);
  const wrongRank = audit.replace(/(^\| Intelligence Index \|.*? \| )([\d.]+) \(#\d+\)/m, "$1$2 (#999)");
  assert.notEqual(wrongRank, audit);
  assert.throws(() => newModelsExpectations(dataset, wrongRank), /intelligence-index: Gemini 4 Hydrogen \(Xhigh\) score and rank agree with audit/);
});

const gptAudit = await readFile(new URL("../docs/GPT_6_2_ASTRA_SOL_COVERAGE.md", import.meta.url), "utf8");

test("GPT-6.2 browser fixture keeps empty CritPt and the Astra-only MMMU-Pro for browser checks", () => {
  const { expected, evaluations } = newModelsExpectations(dataset, gptAudit, "gpt-6.2");
  assert.equal(expected.length, 10);
  assert.equal(evaluations.length, 19);
  assert.equal(evaluations.reduce((sum, { entries }) => sum + entries.length, 0), 175);
  assert.equal(evaluations.find(({ evaluation }) => evaluation.id === "swe-atlas-qna-aa")?.entries.length, 10);
  assert.deepEqual(evaluations.find(({ evaluation }) => evaluation.id === "critpt")?.entries, []);
  const mmmu = evaluations.find(({ evaluation }) => evaluation.id === "mmmu-pro")?.entries;
  assert.equal(mmmu?.length, 5);
  assert(mmmu?.every(entry => entry.model.startsWith("GPT-6.2 Astra")));
});

test("GPT-6.2 browser fixture fails on changed ranks, duplicate rows, and unexpected model spellings", () => {
  const original = dataset.entries.find(entry => entry.evaluation_id === "intelligence-index" && entry.model === "GPT-6.2 Sol (Max)")!;
  const wrongRank = gptAudit.replace(/(^\| Intelligence Index \|.*? \| )([\d.]+) \(#\d+\)/m, "$1$2 (#999)");
  assert.notEqual(wrongRank, gptAudit);
  assert.throws(() => newModelsExpectations(dataset, wrongRank, "gpt-6.2"), /intelligence-index: GPT-6.2 Astra \(Low\) score and rank agree with audit/);
  for (const [model, error] of [
    [original.model, /intelligence-index: duplicate GPT-6.2 Sol/],
    ["gpt-6.2 Sol (Max)", /gpt-6.2: exact canonical family variants/],
  ] as const) {
    const entries = [...dataset.entries, { ...original, id: original.id + "-duplicate", model }];
    assert.throws(() => newModelsExpectations({ ...dataset, entries }, gptAudit, "gpt-6.2"), error);
  }
});
