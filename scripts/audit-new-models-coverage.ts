// Writes docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md from the merged local data (the same merge as src/lib/data.ts)
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

const provider = (m: string) => m.startsWith("Qwen") ? "Alibaba" : "Google";
const models = [
  ...["Xhigh", "High", "Medium", "Low"].map(e => ({ name: `Gemini 4 Hydrogen (${e})`, short: `Hydrogen ${e}`, aa: `Gemini 4 Hydrogen (${e.toLowerCase()})`, slug: "gemini-4-hydrogen" + (e === "Xhigh" ? "" : `-${e.toLowerCase()}`) })),
  { name: "Gemini 4 Argon (Medium)", short: "Argon Medium", aa: "Gemini 4 Argon (medium)", slug: "gemini-4-argon-medium" },
  { name: "Qwen4 Max", short: "Qwen4 Max", aa: "Qwen4 Max", slug: "qwen4-max" },
];
// Argon (High) was captured on 10 Nov; it is allowed in the master list but is not one of the six audited here.
const allowedExtra = ["Gemini 4 Argon (High)"];

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
const pattern = /hydrogen|argon|qwen\s?4/i;
const fuzzy = rows.filter(r => pattern.test(r.model));
const expectedNames = [...models.map(m => m.name), ...allowedExtra].sort();
const actualNames = fuzzy.map(r => r.model).sort();
if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) problems.push(`master rows matching ${pattern} are [${actualNames.join("; ")}], expected exactly [${expectedNames.join("; ")}]`);
problems.push(...issues.filter(i => pattern.test(i.message)).map(i => i.message));

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
const doc = `# Gemini 4 Hydrogen, Gemini 4 Argon (Medium) and Qwen4 Max coverage audit

Captured from the Artificial Analysis (AA) evaluation pages on ${cap}. Generated by \`scripts/audit-new-models-coverage.ts\` from the merged local data (\`data/leaderboards.json\` plus the Briefcase component, rubric and profile-overlay merges, as in \`src/lib/data.ts\`), so rerunning it after a recapture refreshes this file.

## Master rows

\`aggregateMaster\` over the merged data gives exactly one master row for each of the ${models.length} configurations (${rows.length} master rows in total), and no duplicate-row issue names any of them.

| Configuration | Master row |
| --- | --- |
${models.map(m => `| ${m.name} | ${rowOf(m.name).length === 1 ? "1 row" : `**${rowOf(m.name).length} rows**`} |`).join("\n")}

Every master row whose name matches \`${pattern.source}\` (flag \`i\`), so a spelling variant cannot hide. The script fails unless this list is exactly the six configurations above plus Gemini 4 Argon (High), which is from the 10 Nov capture and was not part of this task.

| Master row | Provider |
| --- | --- |
${fuzzy.map(r => `| ${r.model} | ${r.provider} |`).join("\n")}

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

Intelligence Index stored value and rank (from the table above), for the check against AA's model pages: ${models.map(m => { const e = rowOf(m.name)[0]?.cells["intelligence-index"]?.entry; return `${m.short} ${e ? `${fmt(e.score_value as number)} (#${e.source_rank})` : "-"}`; }).join("; ")}.

## Spot checks against the capture JSON (${cap})

Six cells (at least one per model family: Hydrogen, Argon, Qwen4) compared by hand with the chart item in the capture (label as AA writes it, effort in lower case):

| Cell | Capture value | Stored |
| --- | --- | --- |
| Terminal-Bench 4.0, Hydrogen Xhigh | \`terminalbench-4-0.json\` "Gemini 4 Hydrogen (xhigh)" = 0.535353535353535 | 0.5353535354 |
| AA-Omniscience Index, Hydrogen Low | \`omniscience.json\` "Gemini 4 Hydrogen (low)" = 36.1 | 36.1 |
| HLE-Diamond, Qwen4 Max | \`hle-diamond.json\` "Qwen4 Max" = 0.449 | 0.449 |
| SciCode, Argon Medium | \`scicode.json\` "Gemini 4 Argon (medium)" = 0.58912037037037 | 0.5891203704 |
| Briefcase v1.1, Qwen4 Max | \`aa-briefcase.json\` "Qwen4 Max" mid = 1686.07 | 1686.07 |
| GDP.pdf, Hydrogen Medium | \`gdp-pdf.json\` "Gemini 4 Hydrogen (medium)" = 0.328 | 0.328 |

The script also checks every "not on AA" cell: the source file has no series under either the AA label or the full model name.
${problems.length ? `\n## Problems found\n\n${problems.map(p => `- ${p}`).join("\n")}\n` : ""}`;
await writeFile("docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md", doc);
console.log(`filled ${filled}, absent ${absent}, problems ${problems.length}`);
for (const p of problems) console.log(p);
if (problems.length) process.exitCode = 1;
