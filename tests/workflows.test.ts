import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import example from "./fixtures/workflows/scoring-example.json";
import solEfforts from "./fixtures/workflows/sol-efforts.json";
import WorkflowView from "../src/components/workflow-view";
import { getMasterDataset } from "../src/lib/data";
import { masterIdentityKey } from "../src/lib/master";
import { getPersonalityDataset, type PersonalityModel } from "../src/lib/personality";
import { workflows } from "../src/lib/workflow-registry";
import {
  evaluationRanks,
  familyKey,
  rankStep,
  scoreTarget,
  stepPicks,
  validateWorkflow,
  type WorkflowStep,
} from "../src/lib/workflows";

const file = "tests/fixtures/workflows/scoring-example.json";
const [step] = validateWorkflow(file, example).steps;
const sincereStep: WorkflowStep = { ...step, targets: [{ trait: "sincere", aim: "high" }] };
const personality = getPersonalityDataset();

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
  const ranked = rankStep(step, dataset);
  assert.deepEqual(ranked.map(row => [row.model.name, row.percentiles, row.fit]), [
    ["Partial", [80, null, 20], 80],
    ["Complete", [80, 80, 70], (80 + 40 + 30) / 3],
    ["Zero", [null, null, 100], 0],
    ["A missing", [null, null, null], null],
  ]);
  assert.deepEqual(rankStep({ ...step, evaluations: undefined }, dataset), ranked);
});

test("unrounded Fit takes precedence and equal Fit sorts by model name", () => {
  const dataset = { ...personality, models: [
    model("Zulu", { sincere: 80.92 }),
    model("Aaron", { sincere: 80.91 }),
    model("Alpha", { sincere: 80.92 }),
  ] };
  assert.deepEqual(rankStep(sincereStep, dataset, 3).map(row => row.model.name), ["Alpha", "Zulu", "Aaron"]);
  assert.equal(rankStep(sincereStep, dataset, 2).length, 2);
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
  assert.deepEqual(rankStep(tiedStep, dataset).map(row => row.model.name), ["Alpha", "Zulu"]);
});

test("detail keeps five Sol variants and the overview picks three families", () => {
  const models = solEfforts.map(({ name, percentile, provider }) => model(name, { sincere: percentile }, {}, provider));
  const dataset = { ...personality, models };
  const ranked = rankStep(sincereStep, dataset);
  assert.deepEqual(ranked.map(row => row.model.name), ["Max", "XHigh", "High", "Medium", "Low"]
    .map(effort => `GPT-6.2 Sol (${effort})`));

  const { pick, runnersUp } = stepPicks(sincereStep, dataset);
  assert.equal(pick?.model.name, "GPT-6.2 Sol (Max)");
  assert.deepEqual(runnersUp.map(row => row.model.name), ["GPT-6.2 Astra (High)", "Claude Sonnet 5.5 (Max with fallback)"]);
  assert.deepEqual(stepPicks(sincereStep, { ...dataset, models: [] }), { pick: null, runnersUp: [] });
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
  const previousSource = process.env.DATA_SOURCE;
  process.env.DATA_SOURCE = "bundled";
  t.after(() => {
    if (previousSource === undefined) delete process.env.DATA_SOURCE;
    else process.env.DATA_SOURCE = previousSource;
  });

  const { rows } = await getMasterDataset();
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
  const cell = { entry: { source_rank: 1 }, href: `/leaderboards/${briefcase}` };
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
  const files = readdirSync(new URL("../workflows/", import.meta.url)).filter(file => file.endsWith(".json"));
  assert.deepEqual(workflows.map(workflow => `${workflow.slug}.json`).sort(), files.sort());
});

test("sales proposal registers all 14 source steps and keeps the checked picks", () => {
  const proposal = workflows.find(workflow => workflow.slug === "sales-proposal");
  assert.ok(proposal);
  assert.deepEqual(proposal.steps.map(step => step.id), [
    "0", "1", "2", "3a", "3b", "3c", "3d", "3e", "3f", "4", "5", "6", "7", "8",
  ]);

  // Expected names from docs/workflows/sales-proposal-check.md.
  const checkedPicks: Record<string, string> = {
    "1": "Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)",
    "3a": "Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback)",
    "6": "DeepSeek V4.1 Flash 1017 (Max)",
    "7": "DeepSeek V4.1 Flash (Max)",
  };
  for (const step of proposal.steps) {
    const { pick, runnersUp } = stepPicks(step, personality);
    assert.ok(pick && pick.fit !== null, `Missing pick for ${step.id}`);
    assert.equal(runnersUp.length, 2, step.id);
    assert.equal(new Set([pick, ...runnersUp].map(row => familyKey(row.model.identity_key))).size, 3, step.id);
    if (checkedPicks[step.id]) assert.equal(pick.model.name, checkedPicks[step.id], step.id);
  }

  // Worked by hand from data/aa-personalitybench.json in the Phase 1 review (aim moderate, aim low, index target).
  const handRunnersUp: Record<string, string[]> = {
    "3a": [
      "Claude Haiku 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)",
      "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)",
    ],
    "6": ["DeepSeek V4.1 Flash (Max)", "Grok 4.6 (Xhigh)"],
    "7": ["Grok 4.7 (Xhigh)", "Step 5 Preview"],
  };
  for (const [id, names] of Object.entries(handRunnersUp)) {
    const handStep: WorkflowStep | undefined = proposal.steps.find(item => item.id === id);
    assert.ok(handStep, id);
    assert.deepEqual(stepPicks(handStep, personality).runnersUp.map(row => row.model.name), names, id);
  }
});

test("the workflow view links to its detail and preserves raw percentiles and missing ranks", () => {
  const workflow = validateWorkflow(file, example);
  workflow.steps[0].evaluations?.push("briefcase-v1-1");
  workflow.steps.push({ ...workflow.steps[0], id: "3a-heading", evaluations: [] });
  const dataset = { ...personality, models: [model("A long fixture model name", { sincere: 80 }, { warmth: 58 })] };
  const markup = renderToStaticMarkup(createElement(WorkflowView, { workflow, dataset, masterRows: [] }));

  assert.match(markup, /href="#step-3a">Draft<\/a>/);
  assert.match(markup, /<span class="workflow-pick-meta"><span>Fixture<\/span><span>Fit 82<\/span><\/span>/);
  const ids = Array.from(markup.matchAll(/\sid="([^"]+)"/g), match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  const detail = markup.slice(markup.indexOf('id="step-3a"'));
  assert.match(detail, /Warmth index<small>aim moderate<\/small>/);
  assert.match(detail, />Briefcase <small>v1\.1<\/small>/);
  assert.match(detail, />80<\/td><td class="numeric">58<\/td><td class="numeric"><span class="muted">—<\/span><\/td><td class="numeric">82<\/td>/);
  assert.equal(detail.match(/>Not ranked<\/td>/g)?.length, 1);
  assert.match(detail, /Also check \(not in Model Atlas\)/);
});

test("the workflow view has an empty state for a workflow without steps", () => {
  const workflow = { ...validateWorkflow(file, example), steps: [] };
  const markup = renderToStaticMarkup(createElement(WorkflowView, { workflow, dataset: personality, masterRows: [] }));
  assert.match(markup, /No workflow steps yet/);
});
