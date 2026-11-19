import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import leaderboardSource from "../data/leaderboards.json";
import { generateStaticParams } from "../src/app/workflows/[slug]/page";
import WorkflowsPage from "../src/app/workflows/page";
import { proxy } from "../src/proxy";
import modelListSource from "../workflows/models.json";
import benchmarkBar from "./fixtures/workflows/benchmark-bar.json";
import modelListExample from "./fixtures/workflows/model-list-example.json";
import example from "./fixtures/workflows/scoring-example.json";
import solEfforts from "./fixtures/workflows/sol-efforts.json";
import WorkflowView, { WorkflowModelsCard } from "../src/components/workflow-view";
import { getMasterDataset } from "../src/lib/data";
import { masterIdentityKey } from "../src/lib/master";
import { getPersonalityDataset, type PersonalityModel } from "../src/lib/personality";
import { workflowModelList, workflows } from "../src/lib/workflow-registry";
import {
  barRank,
  evaluationRanks,
  familyKey,
  onList,
  rankStep,
  scoreTarget,
  stepNotes,
  stepPicks,
  validateModelList,
  validateWorkflow,
  type WorkflowStep,
} from "../src/lib/workflows";

const file = "tests/fixtures/workflows/scoring-example.json";
const listFile = "tests/fixtures/workflows/model-list-example.json";
const [step] = validateWorkflow(file, example).steps;
const sincereStep: WorkflowStep = { ...step, targets: [{ trait: "sincere", aim: "high" }] };
const personality = getPersonalityDataset();
const fixtureList = validateModelList(listFile, modelListExample);

function model(
  name: string,
  traits: Record<string, number | null> = {},
  indexPercentiles: Record<string, number | null> = {},
  provider = "Fixture",
): PersonalityModel {
  return {
    name,
    provider,
    identity_key: masterIdentityKey(provider, name),
    index_percentiles: indexPercentiles,
    traits: Object.fromEntries(Object.entries(traits).map(([key, percentile]) =>
      [key, { percentile, elo: null, elo_interval: null }])),
  };
}

function rankCell(slug: string, rank: number) {
  return { entry: { source_rank: rank }, href: `/leaderboards/${slug}` };
}

const benchmarkStep = { ...sincereStep, evaluations: benchmarkBar.evaluations };
const benchmarkDataset = { ...personality, models: benchmarkBar.models.map(({ name, fit, provider }) =>
  model(name, { sincere: fit }, {}, provider)) };
const benchmarkRows = benchmarkBar.models.map(({ name, provider, ranks }) => ({
  identity_key: masterIdentityKey(provider, name),
  cells: Object.fromEntries(benchmarkBar.evaluations.flatMap((slug, index) => {
    const rank = ranks[index];
    return rank === null ? [] : [[slug, rankCell(slug, rank)]];
  })),
}));

async function bundledMasterRows() {
  const previousSource = process.env.DATA_SOURCE;
  delete process.env.DATA_SOURCE;
  try {
    return (await getMasterDataset()).rows;
  } finally {
    if (previousSource !== undefined) process.env.DATA_SOURCE = previousSource;
  }
}

test("target scores reward the chosen aim", () => {
  assert.equal(scoreTarget(80, "high"), 80);
  assert.equal(scoreTarget(80, "low"), 20);
  assert.equal(scoreTarget(80, "moderate"), 40);
  assert.equal(scoreTarget(50, "moderate"), 100);
});

test("Fit averages trait and index scores, skips nulls and sorts missing Fit last", () => {
  const dataset = { ...personality, models: [
    model("A missing", { sincere: null }),
    model("Complete", { sincere: 80, slop: 70 }, { warmth: 80 }),
    model("Zero", { slop: 100 }),
    model("Partial", { sincere: 80, slop: 20 }, { warmth: null }),
  ] };
  const ranked = rankStep(step, dataset, fixtureList, []);
  assert.deepEqual(ranked.map(row => [row.model.name, row.percentiles, row.fit]), [
    ["Partial", [80, null, 20], 80],
    ["Complete", [80, 80, 70], (80 + 40 + 30) / 3],
    ["Zero", [null, null, 100], 0],
    ["A missing", [null, null, null], null],
  ]);
  assert.deepEqual(rankStep({ ...step, evaluations: undefined }, dataset, fixtureList, []), ranked);
});

test("unrounded Fit takes precedence and equal Fit sorts by model name", () => {
  const dataset = { ...personality, models: [
    model("Zulu", { sincere: 80.92 }),
    model("Aaron", { sincere: 80.91 }),
    model("Alpha", { sincere: 80.92 }),
  ] };
  assert.deepEqual(rankStep(sincereStep, dataset, fixtureList, [], 3).map(row => row.model.name), ["Alpha", "Zulu", "Aaron"]);
  assert.equal(rankStep(sincereStep, dataset, fixtureList, [], 2).length, 2);
});

test("Fit ties sort by model name when adding the same scores in a different order", () => {
  const tiedStep: WorkflowStep = { ...step, targets: [
    { trait: "sincere", aim: "high" },
    { trait: "truthful", aim: "high" },
    { trait: "creative", aim: "high" },
  ] };
  const dataset = { ...personality, models: [
    model("Zulu", { sincere: 98.1, truthful: 84.77, creative: 98.1 }),
    model("Alpha", { sincere: 98.1, truthful: 98.1, creative: 84.77 }),
  ] };
  assert.deepEqual(rankStep(tiedStep, dataset, fixtureList, []).map(row => row.model.name), ["Alpha", "Zulu"]);
});

test("detail keeps five Sol variants and the overview picks three families", () => {
  const models = solEfforts.map(({ name, percentile, provider }) => model(name, { sincere: percentile }, {}, provider));
  const dataset = { ...personality, models };
  const ranked = rankStep(sincereStep, dataset, workflowModelList, []);
  assert.deepEqual(ranked.map(row => row.model.name), ["Max", "XHigh", "High", "Medium", "Low"]
    .map(effort => `GPT-6.2 Sol (${effort})`));

  const { pick, runnersUp } = stepPicks(sincereStep, dataset, workflowModelList, []);
  assert.equal(pick?.model.name, "GPT-6.2 Sol (Max)");
  assert.deepEqual(runnersUp.map(row => row.model.name), ["GPT-6.2 Astra (High)", "Claude Sonnet 5.5 (Max with fallback)"]);
  assert.deepEqual(stepPicks(sincereStep, { ...dataset, models: [] }, workflowModelList, []), { pick: null, runnersUp: [] });
});

test("the benchmark bar rounds down with a minimum rank of one", () => {
  assert.deepEqual([157, 158, 3].map(barRank), [39, 39, 1]);
});

test("rank 39 of 157 clears the bar, rank 40 and unranked models miss", () => {
  const atBar = model("At the bar", { sincere: 80 });
  const belowBar = model("Below the bar", { sincere: 90 });
  const unranked = model("Unranked", { sincere: 100 });
  const dataset = { ...personality, models: [unranked, belowBar, atBar] };
  const slug = "briefcase-v1-1";
  const masterRows = Array.from({ length: 157 }, (_, index) => {
    const rank = index + 1;
    const identity_key = rank === 39 ? atBar.identity_key : rank === 40 ? belowBar.identity_key : `other\u0000${rank}`;
    return { identity_key, cells: { [slug]: rankCell(slug, rank) } };
  });

  assert.deepEqual(rankStep(sincereStep, dataset, fixtureList, masterRows, 1).map(row => row.model.name), [atBar.name]);
  const notes = stepNotes(sincereStep, dataset, fixtureList, masterRows);
  assert.deepEqual(notes.belowBar.map(row => [row.model.name, row.missedEvaluations]), [
    [unranked.name, [{ slug, rank: null, cohortSize: 157, barRank: 39 }]],
    [belowBar.name, [{ slug, rank: 40, cohortSize: 157, barRank: 39 }]],
  ]);
  assert.deepEqual(evaluationRanks(atBar.identity_key, [slug], masterRows)[slug], { rank: 39, cohortSize: 157 });

  const allMiss = { ...dataset, models: [unranked, belowBar] };
  assert.deepEqual(stepPicks(sincereStep, allMiss, fixtureList, masterRows), { pick: null, runnersUp: [] });

  const noBar = { ...sincereStep, evaluations: [] };
  assert.equal(stepPicks(noBar, dataset, fixtureList, masterRows).pick?.model.name, unranked.name);
  assert.deepEqual(stepNotes(noBar, dataset, fixtureList, masterRows), { belowBar: [], notOnList: [], skippedEvaluations: [] });
});

test("missing and duplicate evaluation slugs preserve active cutoffs and report each skip once", () => {
  const [first, second] = benchmarkStep.evaluations;
  const evaluations = [first, "gdp-pdf", second, first, "gdp-pdf"];
  const stepWithSkips = { ...benchmarkStep, evaluations };
  const skipped = stepNotes(stepWithSkips, benchmarkDataset, workflowModelList, benchmarkRows);
  const original = stepNotes(benchmarkStep, benchmarkDataset, workflowModelList, benchmarkRows);
  assert.deepEqual(skipped, { ...original, skippedEvaluations: ["gdp-pdf"] });
  assert.deepEqual(rankStep(stepWithSkips, benchmarkDataset, workflowModelList, benchmarkRows).map(row => row.model.name), ["Pick"]);
});

test("step notes show up to three higher-Fit families for each reason and every missed rank", () => {
  const [briefcase, omniscience] = benchmarkStep.evaluations;
  const { belowBar, notOnList, skippedEvaluations } = stepNotes(benchmarkStep, benchmarkDataset, workflowModelList, benchmarkRows);
  assert.deepEqual(belowBar.map(row => [row.model.name, row.missedEvaluations]), [
    ["Atlas (Max)", [
      { slug: briefcase, rank: 6, cohortSize: 15, barRank: 3 },
      { slug: omniscience, rank: 7, cohortSize: 16, barRank: 4 },
    ]],
    ["Beacon", [{ slug: briefcase, rank: null, cohortSize: 15, barRank: 3 }]],
    ["Juniper", [{ slug: briefcase, rank: 8, cohortSize: 15, barRank: 3 }]],
  ]);
  assert.deepEqual(notOnList.map(row => row.model.name), ["Alternate (Max)", "Backup", "Contender"]);
  assert.deepEqual(skippedEvaluations, []);

  const models = benchmarkDataset.models.filter(row => (row.traits.sincere.percentile ?? 0) <= 80);
  const dataset = { ...benchmarkDataset, models };
  assert.deepEqual(stepNotes(benchmarkStep, dataset, workflowModelList, benchmarkRows), {
    belowBar: [], notOnList: [], skippedEvaluations: [],
  });
});

test("without an eligible pick, notes show the three best listed families and the picks are empty", () => {
  const dataset = { ...benchmarkDataset, models: benchmarkDataset.models.filter(row => row.name !== "Pick") };
  assert.deepEqual(rankStep(benchmarkStep, dataset, workflowModelList, benchmarkRows), []);
  assert.deepEqual(stepPicks(benchmarkStep, dataset, workflowModelList, benchmarkRows), { pick: null, runnersUp: [] });
  const { belowBar, notOnList } = stepNotes(benchmarkStep, dataset, workflowModelList, benchmarkRows);
  assert.deepEqual(belowBar.map(row => row.model.name), ["Atlas (Max)", "Beacon", "Cedar"]);
  assert.deepEqual(notOnList, []);
});

test("the model list matches providers and canonical model families", () => {
  assert.ok(onList(model("GPT-6.2 Sol (Max)", {}, {}, "OpenAI"), workflowModelList));
  assert.ok(onList(model("gLm-5.3 (MAX)", {}, {}, "Z AI"), workflowModelList));
  assert.ok(onList(model("DeepSeek V4.1 Flash 1017 (Max)", {}, {}, "DeepSeek"), workflowModelList));
  assert.equal(onList(model("DeepSeek V4.1 Flash (Max)", {}, {}, "DeepSeek"), workflowModelList), false);
});

test("every configured provider and family matches a bundled data row", () => {
  assert.deepEqual(workflowModelList, modelListSource);
  const models = [...personality.models, ...leaderboardSource.entries.map(({ provider, model }) => ({
    provider, identity_key: masterIdentityKey(provider, model),
  }))];
  const providers = new Set(models.map(row => row.provider));
  const families = new Set(models.map(row => familyKey(row.identity_key).replace("\u0000", " ")));
  for (const provider of workflowModelList.providers) assert.ok(providers.has(provider), provider);
  for (const { family } of workflowModelList.models) assert.ok(families.has(family), family);
});

test("model list validation names the file and key for missing, mistyped and blank fields", () => {
  const invalidModels = [
    [{ family: "other available model" }, "models[0].label"],
    [{ label: "Available Model", family: 123 }, "models[0].family"],
    [{ label: "   ", family: "other available model" }, "models[0].label"],
  ] as const;
  for (const [entry, key] of invalidModels) {
    assert.throws(() => validateModelList(listFile, { ...modelListExample, models: [entry] }), (error: Error) => {
      assert.ok(error.message.includes(listFile), error.message);
      assert.ok(error.message.includes(key), error.message);
      return true;
    });
  }
});

test("stale entries and long labels validate, and repeated list entries cannot duplicate a pick", () => {
  const unknownFamily = { label: "Long label ".repeat(512), family: "removed model" };
  const source = { ...modelListExample, providers: ["Removed Provider"], models: [unknownFamily] };
  const list = validateModelList(listFile, source);
  assert.deepEqual(list, source);
  const dataset = { ...personality, models: [model("Available Model", { sincere: 90 }, {}, "Other")] };
  assert.deepEqual(rankStep(sincereStep, dataset, list, []), []);

  const entry = fixtureList.models[0];
  const repeats = validateModelList(listFile, { ...source, models: [entry, entry, { ...entry, label: entry.label.toUpperCase() }] });
  assert.equal(rankStep(sincereStep, dataset, repeats, []).length, 1);
});

test("bundled personality identities group only model variants into families", t => {
  const families = new Map<string, string[]>();
  for (const { identity_key: key } of personality.models) {
    const family = familyKey(key);
    const members = families.get(family) ?? [];
    members.push(key);
    families.set(family, members);
  }

  const expected = new Map([
    ["openai\u0000gpt-6.2 sol", 5],
    ["openai\u0000gpt-6.2 astra", 5],
    ["anthropic\u0000claude sonnet 5.5", 2],
    ["anthropic\u0000claude fable 5.1", 1],
    ["anthropic\u0000claude fable 5.2", 1],
  ]);
  for (const [family, keys] of families) {
    if (keys.length < 2) continue;
    if (!expected.has(family)) t.diagnostic(`Additional family: ${keys.map(key => key.replace("\u0000", " / ")).join(", ")}`);
    assert.equal(new Set(keys).size, keys.length, `Duplicate identity in ${family}`);
    for (const key of keys) {
      assert.ok(key.startsWith(family), `${key} must keep its full family name`);
      const suffix = key.slice(family.length);
      assert.ok(suffix === "" || /^ \([^()]+\)$/.test(suffix), `${key} must differ only by the trailing variant`);
    }
  }
  for (const [family, count] of expected) assert.equal(families.get(family)?.length, count, family);
});

test("personality identities join to bundled master rows and preserve Briefcase rank and cohort size", async t => {
  const rows = await bundledMasterRows();
  const briefcase = "briefcase-v1-1";
  const masterByIdentity = new Map(rows.map(row => [row.identity_key, row]));
  const cohortSize = rows.filter(row => row.cells[briefcase]).length;
  let matched = 0;
  let ranked = 0;
  for (const { identity_key: key } of personality.models) {
    const master = masterByIdentity.get(key);
    if (master) matched++;
    const actual = evaluationRanks(key, [briefcase], rows)[briefcase];
    if (actual) ranked++;
    const expectedRank = master?.cells[briefcase]?.entry.source_rank;
    assert.deepEqual(actual, expectedRank === undefined ? null : { rank: expectedRank, cohortSize }, key);
  }
  assert.ok(matched >= 45, `Found ${matched} master identities`);
  assert.ok(ranked >= 45, `Found ${ranked} Briefcase ranks`);
  t.diagnostic(`${matched} of ${personality.models.length} master matches, ${ranked} Briefcase ranks, cohort of ${cohortSize}`);
});

test("evaluation ranks tolerate a missing live evaluation, keep ties and count ranked rows", () => {
  const briefcase = "briefcase-v1-1";
  const cell = rankCell(briefcase, 1);
  const rows = [
    { identity_key: "fixture\u0000model (high)", cells: { [briefcase]: cell } },
    { identity_key: "fixture\u0000model (low)", cells: { [briefcase]: cell } },
    { identity_key: "fixture\u0000other model", cells: {} },
  ];
  assert.deepEqual(evaluationRanks(rows[0].identity_key, [briefcase, "gdp-pdf"], rows), {
    [briefcase]: { rank: 1, cohortSize: 2 },
    "gdp-pdf": null,
  });
  assert.deepEqual(evaluationRanks(rows[2].identity_key, [briefcase], rows), { [briefcase]: null });
  assert.deepEqual(evaluationRanks("missing", [briefcase], rows), { [briefcase]: null });
});

test("validation accepts the fixture and preserves long free text", () => {
  assert.deepEqual(validateWorkflow(file, example), example);
  const note = "A detailed note. ".repeat(512);
  const source = { ...example, steps: [{ ...example.steps[0], id: "0", note }] };
  assert.ok(validateWorkflow(file, source).steps[0].note === note);
});

function withStep(changes: Record<string, unknown>) {
  return { ...example, steps: [{ ...example.steps[0], ...changes }] };
}

const invalidCases: [string, unknown, string, string?][] = [
  ["unknown trait", withStep({ targets: [{ trait: "Sincere", aim: "high" }] }), "steps[0].targets[0].trait", "Sincere"],
  ["unknown index", withStep({ targets: [{ index: "invented", aim: "high" }] }), "steps[0].targets[0].index", "invented"],
  ["unknown evaluation slug", withStep({ evaluations: ["gdp-word"] }), "steps[0].evaluations[0]", "gdp-word"],
  ["unknown aim", withStep({ targets: [{ trait: "sincere", aim: "middle" }] }), "steps[0].targets[0].aim", "middle"],
  ["both target keys", withStep({ targets: [{ trait: "sincere", index: "warmth", aim: "high" }] }), "steps[0].targets[0]", "trait or index"],
  ["missing target key", withStep({ targets: [{ aim: "high" }] }), "steps[0].targets[0]", "trait or index"],
  ["no targets", withStep({ targets: [] }), "steps[0].targets"],
  ["missing targets", withStep({ targets: undefined }), "steps[0].targets"],
  ["duplicate ids", { ...example, steps: [example.steps[0], example.steps[0]] }, "steps[1].id", "3a"],
  ["id with a space", withStep({ id: "3 a" }), "steps[0].id", "3 a"],
  ["id with a capital", withStep({ id: "3A" }), "steps[0].id", "3A"],
  ["blank id", withStep({ id: "" }), "steps[0].id"],
  ["blank goal", withStep({ goal: "  " }), "steps[0].goal"],
  ["an updated value that isn't a date", { ...example, updated: "19 Nov" }, "updated", "19 Nov"],
  ["duplicate target", withStep({ targets: [{ trait: "sincere", aim: "high" }, { trait: "sincere", aim: "low" }] }), "steps[0].targets[1]", "trait sincere"],
  ["slug and filename mismatch", { ...example, slug: "another-slug" }, "slug", "another-slug"],
];

for (const [label, source, path, value] of invalidCases) {
  test(`validation rejects ${label} and names the file and field`, () => {
    assert.throws(() => validateWorkflow(file, source), (error: Error) => {
      assert.ok(error.message.includes(file), error.message);
      assert.ok(error.message.includes(path), error.message);
      if (value) assert.ok(error.message.includes(value), error.message);
      return true;
    });
  });
}

test("registry covers every workflow JSON file", () => {
  const files = readdirSync(new URL("../workflows/", import.meta.url))
    .filter(file => file.endsWith(".json") && file !== "models.json");
  assert.deepEqual(workflows.map(workflow => `${workflow.slug}.json`).sort(), files.sort());
});

test("the meeting workflow is linked from the catalog and accepted by the detail route", () => {
  const slug = "client-meeting-followup";
  const path = `/workflows/${slug}`;
  const markup = renderToStaticMarkup(createElement(WorkflowsPage));
  assert.ok(markup.includes(`href="${path}"`));
  assert.match(markup, /aria-label="Open Client meeting follow-up"/);
  assert.match(markup, /No personality scores yet for Qwen4 Max\./);
  assert.ok(generateStaticParams().some(params => params.slug === slug));
  assert.equal(proxy(new NextRequest(`http://localhost${path}`)).headers.get("x-middleware-next"), "1");
});

test("the meeting workflow preserves the six steps' targets, evaluations and notes from the brief", () => {
  const meeting = workflows.find(workflow => workflow.slug === "client-meeting-followup");
  assert.ok(meeting);
  const steps = meeting.steps.map(({ id, targets, evaluations, note }) => [
    id,
    targets.map(({ aim, trait, index }) => `${aim} ${index === undefined ? trait : `index:${index}`}`),
    evaluations ?? [],
    note ?? null,
  ]);
  assert.deepEqual(steps, [
    ["1", ["high truthful", "high disclaimsWithAssumptions", "high informationDense", "high flagsNuances"],
      ["briefcase-v1-1", "aa-omniscience-index"], null],
    ["2", ["high evidenceBased", "high pragmatic", "high constructivelyPushesBack", "high flagsNuances", "low sycophantic"],
      ["strategy-ops-index", "aa-briefcase-analytical-quality-elo"], null],
    ["3", ["high providesActionableGuidance", "high pragmatic", "high direct", "high disclaimsWithAssumptions", "low openEnded"],
      ["strategy-ops-index", "briefcase-v1-1"],
      "No benchmark tests date suggestions. Give the model the meeting date and today's date, and check every date by hand."],
    ["4", ["high index:organization", "low slop"],
      ["aa-briefcase-presentation-elo", "aa-briefcase-rubric-score"], null],
    ["5", ["high naturalSounding", "high sincere", "high direct", "moderate index:warmth", "low slop", "low sycophantic"],
      [], null],
    ["6", ["high index:transparency", "high constructivelyPushesBack", "low sycophantic"],
      ["aa-omniscience-index"], "Use a fresh chat and a different model from step 4."],
  ]);
});

test("the meeting workflow pins each independently checked pick and both runners-up", async () => {
  const meeting = workflows.find(workflow => workflow.slug === "client-meeting-followup");
  assert.ok(meeting);
  const masterRows = await bundledMasterRows();
  const picks = meeting.steps.map(step => {
    const { pick, runnersUp } = stepPicks(step, personality, workflowModelList, masterRows);
    return [step.id, [pick, ...runnersUp].map(row => row?.model.identity_key)];
  });
  assert.deepEqual(picks, [
    ["1", [
      "anthropic\u0000claude opus 5.5 (max with fallback)",
      "anthropic\u0000claude fable 5.1 (max with fallback)",
      "openai\u0000gpt-6 astra (max)",
    ]],
    ["2", [
      "anthropic\u0000claude fable 5.1 (max with fallback)",
      "anthropic\u0000claude opus 5.5 (max with fallback)",
      "anthropic\u0000claude sonnet 5.5 (max with fallback)",
    ]],
    ["3", [
      "anthropic\u0000claude fable 5.1 (max with fallback)",
      "anthropic\u0000claude opus 5.5 (max with fallback)",
      "openai\u0000gpt-6.2 sol (high)",
    ]],
    ["4", [
      "openai\u0000gpt-6.1 sol (max)",
      "anthropic\u0000claude sonnet 5.5 (max with fallback)",
      "anthropic\u0000claude opus 5.5 (max with fallback)",
    ]],
    ["5", [
      "openai\u0000gpt-6.2 astra (medium)",
      "openai\u0000gpt-6.2 sol (high)",
      "openai\u0000gpt-6 sol (max)",
    ]],
    ["6", [
      "anthropic\u0000claude fable 5.1 (max with fallback)",
      "anthropic\u0000claude opus 5.5 (max with fallback)",
      "anthropic\u0000claude fable 5.2 (max with fallback)",
    ]],
  ]);
});

test("sales proposal registers all 14 source steps and pins the filtered picks", async () => {
  const proposal = workflows.find(workflow => workflow.slug === "sales-proposal");
  assert.ok(proposal);
  assert.deepEqual(proposal.steps.map(step => step.id), [
    "0", "1", "2", "3a", "3b", "3c", "3d", "3e", "3f", "4", "5", "6", "7", "8",
  ]);

  const masterRows = await bundledMasterRows();
  // Independently checked against the model list and benchmark bar.
  const checkedPicks: Record<string, string> = {
    "1": "Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)",
    "3a": "Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback)",
    "6": "DeepSeek V4.1 Flash 1017 (Max)",
    "7": "GPT-6.2 Sol (Medium)",
  };
  for (const step of proposal.steps) {
    const { pick, runnersUp } = stepPicks(step, personality, workflowModelList, masterRows);
    assert.ok(pick && pick.fit !== null, `Missing pick for ${step.id}`);
    assert.equal(runnersUp.length, 2, step.id);
    assert.equal(new Set([pick, ...runnersUp].map(row => familyKey(row.model.identity_key))).size, 3, step.id);
    if (checkedPicks[step.id]) assert.equal(pick.model.name, checkedPicks[step.id], step.id);
  }

  const checkedRunnersUp: Record<string, string[]> = {
    "3a": [
      "Claude Haiku 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)",
      "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)",
    ],
    "6": ["Grok 4.5 (High)", "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)"],
    "7": ["Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback)", "GPT-6.2 Astra (Xhigh)"],
  };
  for (const [id, names] of Object.entries(checkedRunnersUp)) {
    const checkedStep: WorkflowStep | undefined = proposal.steps.find(item => item.id === id);
    assert.ok(checkedStep, id);
    assert.deepEqual(stepPicks(checkedStep, personality, workflowModelList, masterRows).runnersUp.map(row => row.model.name), names, id);
  }
});

test("the workflow view links to its detail and preserves raw percentiles and missing ranks", () => {
  const workflow = validateWorkflow(file, example);
  workflow.steps[0].evaluations?.push("briefcase-v1-1");
  workflow.steps.push({ ...workflow.steps[0], id: "3a-heading", evaluations: [] });
  const dataset = { ...personality, models: [model("A long fixture model name", { sincere: 80 }, { warmth: 58 }, "OpenAI")] };
  const markup = renderToStaticMarkup(createElement(WorkflowView, { workflow, dataset, masterRows: [] }));

  assert.match(markup, /href="#step-3a">Draft<\/a>/);
  assert.match(markup, /<span class="workflow-pick-meta"><span>OpenAI<\/span><span>Fit 82<\/span><\/span>/);
  const ids = Array.from(markup.matchAll(/\sid="([^"]+)"/g), match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  const detail = markup.slice(markup.indexOf('id="step-3a"'));
  assert.match(detail, /Warmth index<small>aim moderate<\/small>/);
  assert.match(detail, />Briefcase <small>v1\.1<\/small>/);
  assert.match(detail, />80<\/td><td class="numeric">58<\/td><td class="numeric"><span class="muted">—<\/span><\/td><td class="numeric">82<\/td>/);
  assert.equal(detail.match(/>Not ranked<\/td>/g)?.length, 1);
  assert.match(detail, /Also check \(not in Model Atlas\)/);
});

test("the workflow overview and detail use the benchmark ranks supplied to the view", async () => {
  const workflow = validateWorkflow(file, example);
  const masterRows = await bundledMasterRows();
  const passing = masterRows.find(row => row.cells["briefcase-v1-1"]?.entry.source_rank === 1);
  assert.ok(passing);
  const dataset = { ...personality, models: [
    model(passing.model, { sincere: 80 }, {}, passing.provider),
    model("Higher Fit unranked", { sincere: 100 }, {}, "OpenAI"),
  ] };
  const markup = renderToStaticMarkup(createElement(WorkflowView, { workflow, dataset, masterRows }));
  assert.ok(markup.includes(`<span class="workflow-pick-name">${passing.model}</span>`));
  assert.ok(markup.includes(`<td class="workflow-pinned workflow-model">${passing.model}</td>`));
  assert.doesNotMatch(markup, /class="workflow-(pick-name|pinned workflow-model)">Higher Fit unranked/);
});

test("the workflow view has an empty state for a workflow without steps", () => {
  const workflow = { ...validateWorkflow(file, example), steps: [] };
  const markup = renderToStaticMarkup(createElement(WorkflowView, { workflow, dataset: personality, masterRows: [] }));
  assert.match(markup, /No workflow steps yet/);
});

function renderBenchmarkStep(step: WorkflowStep, dataset = benchmarkDataset, masterRows = benchmarkRows) {
  const workflow = { ...validateWorkflow(file, example), steps: [step] };
  const markup = renderToStaticMarkup(createElement(WorkflowView, { workflow, dataset, masterRows }));
  const stepStart = markup.indexOf(`id="step-${step.id}"`);
  assert.ok(stepStart > 0);
  return { overview: markup.slice(0, stepStart), detail: markup.slice(stepStart) };
}

test("a step with no pick shows a dash and explains why in the overview and detail", () => {
  const dataset = { ...benchmarkDataset, models: benchmarkDataset.models.filter(model => model.name !== "Pick") };
  const { overview, detail } = renderBenchmarkStep(benchmarkStep, dataset);
  const noPick = /<span class="muted">—<\/span> <span>No model on your list clears the bar<\/span>/;
  assert.match(overview, noPick);
  assert.match(detail, noPick);
  assert.doesNotMatch(overview, /class="workflow-runners-up"/);
  assert.doesNotMatch(detail, /<table/);
  assert.match(detail, /No model on your list clears the bar.*Higher Fit, below the bar.*Atlas \(Max\), Fit\u00a099: Briefcase v1\.1 #6 of 15, bar #3 \/ Omniscience Index #7 of 16, bar #4/);
  assert.match(detail, /Beacon, Fit\u00a097: Briefcase v1\.1 Not ranked, bar #3/);
  assert.doesNotMatch(detail, /Higher Fit, not on your list/);
});

test("the overview renders one runner-up and the detail ranks just the two eligible models", () => {
  const runner = model("Runner-up", { sincere: 78 }, {}, "OpenAI");
  const dataset = { ...benchmarkDataset, models: [...benchmarkDataset.models, runner] };
  const masterRows = [...benchmarkRows, {
    identity_key: runner.identity_key,
    cells: Object.fromEntries(benchmarkStep.evaluations.map(slug => [slug, rankCell(slug, 2)])),
  }];
  const { overview, detail } = renderBenchmarkStep(benchmarkStep, dataset, masterRows);
  assert.match(overview, /The pick and runners-up are from different model families\. Step rankings can include several variants of a family\./);
  assert.match(overview, /Scroll past Pick for the goal, aims, and runners-up\./);
  assert.match(overview, /<table aria-describedby="workflow-overview-help"/);
  const runners = overview.match(/<ul class="workflow-runners-up">(.*?)<\/ul>/)?.[1] ?? "";
  assert.match(runners, /<li><span class="workflow-pick-name">Runner-up<\/span>/);
  assert.equal(runners.match(/<li>/g)?.length, 1);
  assert.deepEqual(Array.from(detail.matchAll(/<td class="workflow-pinned workflow-model">([^<]+)<\/td>/g), match => match[1]), ["Pick", "Runner-up"]);
  assert.match(detail, /Only models on your list that clear the bar are ranked/);
  assert.match(detail, /<\/table>.*Higher Fit, not on your list<\/strong> · Alternate \(Max\), Fit\u00a093/);
});

test("a skipped evaluation keeps its unranked column and names the benchmark once below the table", () => {
  const { detail } = renderBenchmarkStep({ ...benchmarkStep, evaluations: [...benchmarkStep.evaluations, "gdp-pdf", "gdp-pdf"] });
  assert.equal(detail.match(/>Not ranked<\/td>/g)?.length, 1);
  assert.match(detail, /<\/table>.*Skipped by the bar<\/strong> · GDP\.pdf<\/p>/);
  assert.doesNotMatch(detail, /No benchmarks for this step/);
  const noBar = renderBenchmarkStep({ ...benchmarkStep, evaluations: [] }).detail;
  assert.match(noBar, /<\/table>.*No benchmarks for this step, so no bar/);
  assert.doesNotMatch(noBar, /Skipped by the bar/);
});

test("the model list card omits the scores note when every family has a personality row", () => {
  const dataset = { ...personality, models: [model("Available Model (Max)", {}, {}, "Other")] };
  const markup = renderToStaticMarkup(createElement(WorkflowModelsCard, { list: fixtureList, dataset }));
  assert.match(markup, /Your models/);
  assert.match(markup, /Any Fixture model/);
  assert.match(markup, /Available Model/);
  assert.doesNotMatch(markup, /No personality scores yet/);
});

test("the model list card shows a stale long label and reports exact duplicate entries once", () => {
  const label = "LongUnscoredModelLabel".repeat(20);
  const entry = { label, family: "other removed model" };
  const list = validateModelList(listFile, { ...modelListExample, models: [entry, entry] });
  const markup = renderToStaticMarkup(createElement(WorkflowModelsCard, { list, dataset: benchmarkDataset }));
  assert.equal(markup.split(`>${label}</span>`).length, 2);
  assert.ok(markup.includes(`No personality scores yet for ${label}.</p>`));
});
