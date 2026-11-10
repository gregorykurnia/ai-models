// Writes docs/FABLE_5_2_MUSE_EMBER_COVERAGE.md from the merged local data (the same merge as src/lib/data.ts)
// and checks every "not on AA" cell against the capture files. Run: node --import tsx scripts/audit-new-models-coverage.ts
import { readFile, writeFile } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import { mergeBriefcaseComponents, type BriefcaseComponentsSource } from "../src/lib/aa-briefcase";
import { mergeBriefcaseRubricRefresh, type BriefcaseRubricRefreshSource } from "../src/lib/aa-briefcase-rubric-refresh";
import { mergeAaModelProfileOverlays, type AaModelProfileOverlay } from "../src/lib/aa-model-profile-overlays";
import { aggregateMaster, masterIdentityKey } from "../src/lib/master";
import { getIntelligenceIndexTaskCostMap } from "../src/lib/intelligence-index-costs";
import { getModelSpeedMap } from "../src/lib/model-speed";

const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const merged = mergeBriefcaseRubricRefresh(
  mergeAaModelProfileOverlays(
    mergeBriefcaseComponents(await read("data/leaderboards.json") as Dataset, await read("data/aa-briefcase-components.json") as BriefcaseComponentsSource),
    await read("data/aa-model-profile-overlays.json") as AaModelProfileOverlay),
  await read("data/aa-briefcase-rubric-refresh.json") as BriefcaseRubricRefreshSource);
const { rows, issues } = aggregateMaster(merged.evaluations, merged.entries, getIntelligenceIndexTaskCostMap(), getModelSpeedMap());

const provider = (m: string) => m.startsWith("Claude") ? "Anthropic" : "Meta";
const efforts = ["Max", "Xhigh", "High", "Medium", "Low"];
const models = [
  ...efforts.map(e => ({ name: `Claude Fable 5.2 (Adaptive Reasoning, ${e} Effort, Default Fallback)`, short: `Fable 5.2 ${e}`, aa: `Claude Fable 5.2 (${e.toLowerCase()})`, slug: "claude-fable-5-2" + (e === "Max" ? "" : `-${e.toLowerCase()}`) })),
  { name: "Muse Ember (Max)", short: "Muse Ember Max", aa: "Muse Ember (max)", slug: "muse-ember" },
  { name: "Muse Ember (Xhigh)", short: "Muse Ember Xhigh", aa: "Muse Ember (xhigh)", slug: "muse-ember-xhigh" },
];

// Where each evaluation's stored rows come from.
const componentFiles: Record<string, string> = {
  "aa-briefcase-rubric-score": "data/aa-briefcase-rubric-refresh.json",
  "aa-briefcase-analytical-quality-elo": "data/aa-briefcase-components.json",
  "aa-briefcase-presentation-elo": "data/aa-briefcase-components.json",
};
const captureOf: Record<string, string> = {
  "briefcase-v1-1": "aa-briefcase", "gdpval-aa-v2-1": "gdpval-aa", "automationbench-aa": "automationbench-aa", "terminal-bench-4-0": "terminalbench-4-0",
  "scicode": "scicode", "hle-diamond": "hle-diamond", "frontiercode-2-0": "frontiercode-2-0", "gdp-pdf": "gdp-pdf", "critpt": "critpt",
  "aa-omniscience-accuracy": "omniscience", "aa-omniscience-index": "omniscience", "aa-lcr-v1-1": "artificial-analysis-long-context-reasoning",
  "mmmu-pro": "mmmu-pro", "finance-accounting": "finance-and-accounting", "economics-index": "economics", "strategy-ops-index": "strategy-and-ops",
  "intelligence-index": "artificial-analysis-intelligence-index",
};
const fileOf = (id: string) => componentFiles[id] ?? `data/aa-captures/${captureOf[id]}.json`;

// Raw text of each source file, to confirm that "not on AA" cells really are absent from the capture.
const rawText = new Map<string, string>();
for (const e of merged.evaluations) if (!rawText.has(fileOf(e.id))) rawText.set(fileOf(e.id), (await readFile(fileOf(e.id), "utf8")).toLowerCase());
const mentions = (file: string, m: { aa: string; name: string }) => {
  const text = rawText.get(file)!;
  return [m.aa, m.name].some(n => text.includes(`"${n.toLowerCase()}"`));
};

const rowOf = (name: string) => rows.filter(r => r.identity_key === masterIdentityKey(provider(name), name));
const problems: string[] = [];
for (const m of models) if (rowOf(m.name).length !== 1) problems.push(`${m.name}: ${rowOf(m.name).length} master rows`);
const fuzzy = rows.filter(r => /fable 5\.2|muse ember/i.test(r.model));
if (fuzzy.length !== models.length) problems.push(`master has ${fuzzy.length} Fable 5.2 / Muse Ember rows, expected ${models.length}: ${fuzzy.map(r => r.model).join("; ")}`);
problems.push(...issues.filter(i => /fable 5\.2|muse ember/i.test(i.message)).map(i => i.message));

const fmt = (v: number) => String(Number(v.toPrecision(10)));
const evals = merged.evaluations;
const body: string[] = [];
let filled = 0, absent = 0;
for (const e of evals) {
  const cells = models.map(m => {
    const entry = rowOf(m.name)[0]?.cells[e.id]?.entry;
    if (entry) { filled++; return `${fmt(entry.score_value as number)} (#${entry.source_rank})`; }
    absent++;
    if (mentions(fileOf(e.id), m)) problems.push(`${e.id} / ${m.name}: cell empty but the source file mentions it`);
    return `not on AA (captured ${e.captured_at})`;
  });
  body.push(`| ${e.display_name} | \`${e.id}\` | \`${e.metric_key}\` | \`${fileOf(e.id)}\` | ${cells.join(" | ")} |`);
}

const speedRows = models.map(m => {
  const r = rowOf(m.name)[0];
  const c = r?.intelligence_index_cost, s = r?.speed;
  return `| ${m.name} | \`${m.slug}\` | ${c ? `$${fmt(c.cost_usd)}` : "-"} | ${s?.time_per_task_s != null ? fmt(s.time_per_task_s) : "-"} | ${s?.first_answer_s != null ? fmt(s.first_answer_s) : "-"} |`;
});

const cap = (await read("data/aa-captures/aa-briefcase.json")).captured_at;
const doc = `# Claude Fable 5.2 and Muse Ember coverage audit

Captured from the Artificial Analysis (AA) evaluation pages on ${cap}. Generated by \`scripts/audit-new-models-coverage.ts\` from the merged local data (\`data/leaderboards.json\` plus the Briefcase component, rubric and profile-overlay merges, as in \`src/lib/data.ts\`), so rerunning it after a recapture refreshes this file.

## Master rows

\`aggregateMaster\` over the merged data gives exactly one master row for each of the ${models.length} configurations (${rows.length} master rows in total), and no duplicate-row issue names any of them.

| Configuration | Master row |
| --- | --- |
${models.map(m => `| ${m.name} | ${rowOf(m.name).length === 1 ? "1 row" : `**${rowOf(m.name).length} rows**`} |`).join("\n")}

## Evaluation coverage

Each cell is the stored \`score_value\` with its rank on that evaluation. Units follow the leaderboard convention (percent benchmarks are source fractions, Elo is actual Elo, the Rubric Score is percentage points). "not on AA" means the model has no stored row and the source file has no series under that name. The Source column is the file the rows were imported from.

| Evaluation | Id | Metric | Source | ${models.map(m => m.short).join(" | ")} |
| --- | --- | --- | --- | ${models.map(() => "---").join(" | ")} |
${body.join("\n")}

${filled} cells hold a stored value and ${absent} are "not on AA" (${evals.length * models.length} in total).

## Intelligence Index cost and speed

Cost per Intelligence Index task is from \`data/intelligence-index-costs.json\`, Time per Task and First Answer (seconds) from \`data/aa-model-speed.json\`. A dash means AA has no value for that model in the capture.

| Configuration | AA slug | Cost per Intelligence Index task (USD) | Time per Task (s) | First Answer (s) |
| --- | --- | ---: | ---: | ---: |
${speedRows.join("\n")}

Muse Ember has no record in \`data/aa-model-speed.json\`, so its Time per Task and First Answer are dashes until AA publishes them.

## Spot checks against the capture JSON (${cap})

Five cells compared by hand with the chart item in the capture (label as AA writes it in lower case):

| Cell | Capture value | Stored |
| --- | --- | --- |
| Terminal-Bench 4.0, Fable 5.2 Xhigh | \`terminalbench-4-0.json\` chart "Terminal-Bench 4.0: Score", "Claude Fable 5.2 (xhigh)" = 0.616161616161616 | 0.6161616162 |
| AA-Omniscience Accuracy, Muse Ember Max | \`omniscience.json\` chart "AA-Omniscience Accuracy", "Muse Ember (max)" = 0.21066666666666667 | 0.2106666667 |
| HLE-Diamond, Fable 5.2 Low | \`hle-diamond.json\` chart "HLE-Diamond: Score", "Claude Fable 5.2 (low)" = 0.608 | 0.608 |
| Briefcase v1.1, Fable 5.2 Max | \`aa-briefcase.json\` chart "AA-Briefcase Elo", "Claude Fable 5.2 (max)" mid = 1785.32 | 1785.32 |
| SciCode, Fable 5.2 Medium | \`scicode.json\` chart "SciCode: Score", "Claude Fable 5.2 (medium)" = 0.597222222222222 | 0.5972222222 |

The script also checks every "not on AA" cell: the source file has no series under either the AA label or the full model name.
${problems.length ? `\n## Problems found\n\n${problems.map(p => `- ${p}`).join("\n")}\n` : ""}`;
await writeFile("docs/FABLE_5_2_MUSE_EMBER_COVERAGE.md", doc);
console.log(`filled ${filled}, absent ${absent}, problems ${problems.length}`);
for (const p of problems) console.log(p);
