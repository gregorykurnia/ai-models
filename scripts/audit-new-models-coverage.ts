// Audits the merged local snapshots and writes the selected model set's coverage report.
// Run: node --import tsx scripts/audit-new-models-coverage.ts --set gpt-6.2
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import { mergeBriefcaseComponents, type BriefcaseComponentsSource } from "../src/lib/aa-briefcase";
import { mergeBriefcaseRubricRefresh, type BriefcaseRubricRefreshSource } from "../src/lib/aa-briefcase-rubric-refresh";
import { mergeAaModelProfileOverlays, type AaModelProfileOverlay } from "../src/lib/aa-model-profile-overlays";
import { aggregateMaster, masterIdentityKey } from "../src/lib/master";
import { getIntelligenceIndexTaskCostMap } from "../src/lib/intelligence-index-costs";
import { getModelSpeedMap } from "../src/lib/model-speed";

type Model = { name: string; short: string; provider: string; slug: string };

const hydrogenModels: Model[] = [
  ...["Xhigh", "High", "Medium", "Low"].map(effort => ({
    name: `Gemini 4 Hydrogen (${effort})`,
    short: `Hydrogen ${effort}`,
    provider: "Google",
    slug: "gemini-4-hydrogen" + (effort === "Xhigh" ? "" : `-${effort.toLowerCase()}`),
  })),
  { name: "Gemini 4 Argon (Medium)", short: "Argon Medium", provider: "Google", slug: "gemini-4-argon-medium" },
  { name: "Qwen4 Max", short: "Qwen4 Max", provider: "Alibaba", slug: "qwen4-max" },
];
const gptModels: Model[] = ["Astra", "Sol"].flatMap(family =>
  ["Low", "Medium", "High", "Xhigh", "Max"].map(effort => ({
    name: `GPT-6.2 ${family} (${effort})`,
    short: `${family} ${effort}`,
    provider: "OpenAI",
    slug: `gpt-6-2-${family.toLowerCase()}` + (effort === "Max" ? "" : `-${effort.toLowerCase()}`),
  })),
);
const sets = {
  hydrogen: {
    models: hydrogenModels,
    extra: [{ name: "Gemini 4 Argon (High)", provider: "Google" }],
    pattern: /hydrogen|argon|qwen\s?4/i,
    title: "Gemini 4 Hydrogen, Gemini 4 Argon (Medium) and Qwen4 Max coverage audit",
    report: "docs/GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md",
  },
  "gpt-6.2": {
    models: gptModels,
    extra: [],
    pattern: /gpt-6\.2/i,
    title: "GPT-6.2 Astra and Sol coverage audit",
    report: "docs/GPT_6_2_ASTRA_SOL_COVERAGE.md",
  },
};

const args = process.argv.slice(2);
const setName = args.length === 0 ? "hydrogen" : args[1];
if ((args.length > 0 && (args.length !== 2 || args[0] !== "--set")) || (setName !== "hydrogen" && setName !== "gpt-6.2")) {
  console.error("Usage: node --import tsx scripts/audit-new-models-coverage.ts [--set hydrogen|gpt-6.2]");
  process.exit(1);
}
const { models, extra, pattern, title, report } = sets[setName];

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8"));
const [base, components, overlays, rubric] = await Promise.all([
  readJson<Dataset>("data/leaderboards.json"),
  readJson<BriefcaseComponentsSource>("data/aa-briefcase-components.json"),
  readJson<AaModelProfileOverlay>("data/aa-model-profile-overlays.json"),
  readJson<BriefcaseRubricRefreshSource>("data/aa-briefcase-rubric-refresh.json"),
]);
const merged = mergeBriefcaseRubricRefresh(mergeAaModelProfileOverlays(mergeBriefcaseComponents(base, components), overlays), rubric);
const { rows } = aggregateMaster(merged.evaluations, merged.entries, getIntelligenceIndexTaskCostMap(), getModelSpeedMap());

const fuzzy = rows.filter(row => pattern.test(row.model));
const expected = [...models, ...extra].map(model => `${model.name} (${model.provider})`).sort();
const actual = fuzzy.map(row => `${row.model} (${row.provider})`).sort();
const problems: string[] = [];
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  problems.push(`Master rows matching ${pattern}: [${actual.join(", ")}]. Expected exactly [${expected.join(", ")}].`);
}

const rowsByIdentity = new Map(fuzzy.map(row => [row.identity_key, row]));
const modelRows = models.map(model => ({ model, row: rowsByIdentity.get(masterIdentityKey(model.provider, model.name)) }));
// Aggregation coalesces case and spacing variants. Check the underlying rows as well.
for (const row of fuzzy) {
  const seen = new Set<string>();
  for (const entry of row.source_entries) {
    if (entry.model !== row.model || entry.provider !== row.provider) {
      problems.push(`${entry.evaluation_id}: unexpected spelling or provider for ${row.model}: ${entry.model} (${entry.provider}).`);
    }
    if (seen.has(entry.evaluation_id)) problems.push(`${entry.evaluation_id}: duplicate entry for ${row.model}.`);
    seen.add(entry.evaluation_id);
  }
}

const assets = new Map(merged.sourceAssets?.map(asset => [asset.id, asset.filename]));
function fileOf(assetId: string, evaluationId: string): string {
  const filename = assets.get(assetId);
  if (typeof filename !== "string" || !filename.trim()) {
    throw new Error(`${evaluationId}: missing capture filename for source asset ${assetId}`);
  }
  return `data/${filename}`;
}
const rawText = new Map<string, string>();
async function captureText(file: string): Promise<string> {
  if (!rawText.has(file)) rawText.set(file, (await readFile(file, "utf8")).toLowerCase());
  return rawText.get(file)!;
}

const fmt = (value: number) => String(Number(value.toPrecision(10)));
const body: string[] = [];
let filled = 0;
let absent = 0;
for (const evaluation of merged.evaluations) {
  const file = fileOf(evaluation.source_asset_id, evaluation.id);
  const source = await captureText(file);
  const supplemental = new Map<string, string[]>();
  const cells = [];
  for (const { model, row } of modelRows) {
    const entry = row?.cells[evaluation.id]?.entry;
    if (entry) {
      if (!Number.isFinite(entry.score_value) || !Number.isInteger(entry.source_rank) || entry.source_rank < 1) {
        problems.push(`${evaluation.id} / ${model.name}: invalid stored score or source rank.`);
        cells.push("-");
        continue;
      }
      const entryFile = fileOf(entry.source_asset_id, evaluation.id);
      if (entryFile !== file) {
        await captureText(entryFile);
        const names = supplemental.get(entryFile) ?? [];
        names.push(model.short);
        supplemental.set(entryFile, names);
      }
      filled++;
      cells.push(`${fmt(entry.score_value)} (#${entry.source_rank})`);
      continue;
    }
    absent++;
    if ([model.name.toLowerCase(), model.slug].some(label => source.includes(`"${label}"`))) {
      problems.push(`${evaluation.id} / ${model.name}: cell empty but ${file} mentions it.`);
    }
    cells.push(`not on AA (captured ${evaluation.captured_at})`);
  }
  const sources = [`\`${file}\``, ...[...supplemental].map(([path, names]) => `\`${path}\` (${names.join(", ")})`)];
  body.push(`| ${evaluation.display_name} | \`${evaluation.id}\` | \`${evaluation.metric_key}\` | ${sources.join(", ")} | ${cells.join(" | ")} |`);
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

const speedRows = modelRows.map(({ model, row }) => {
  const cost = row?.intelligence_index_cost;
  const speed = row?.speed;
  return `| ${model.name} | \`${model.slug}\` | ${cost ? `$${fmt(cost.cost_usd)}` : "-"} | ${speed?.time_per_task_s != null ? fmt(speed.time_per_task_s) : "-"} | ${speed?.first_answer_s != null ? fmt(speed.first_answer_s) : "-"} |`;
});

const dates = [...new Set(merged.evaluations.map(evaluation => evaluation.captured_at))].sort();
const doc = `# ${title}

Generated by \`scripts/audit-new-models-coverage.ts --set ${setName}\` from \`data/leaderboards.json\` with the Briefcase component, profile-overlay and rubric merges used by \`src/lib/data.ts\`. The evaluations were captured on ${dates.join(", ")}.

## Master rows

${models.length} audited configurations across ${rows.length} master rows. Every row matching \`${pattern}\` appears below. The audit requires exactly the listed model names and providers.${extra.length ? " Gemini 4 Argon (High) is included in the master check and has no coverage column." : ""}

| Master row | Provider |
| --- | --- |
${fuzzy.map(row => `| ${row.model} | ${row.provider} |`).join("\n")}

## Evaluation coverage

Cells show the stored \`score_value\` to 10 significant digits and its \`source_rank\`. Percentage scores are stored as fractions or percentage points. CritPt v2, the Briefcase Rubric Score, and SWE-Atlas-QnA use percentage points. Elo uses Elo points. The Source column identifies the capture for each evaluation. Each "not on AA" cell has no stored row or matching label in the listed capture.

| Evaluation | Id | Metric | Source | ${models.map(model => model.short).join(" | ")} |
| --- | --- | --- | --- | ${models.map(() => "---").join(" | ")} |
${body.join("\n")}

${filled} cells hold a stored value and ${absent} are "not on AA" (${filled + absent} total).

## Intelligence Index cost and speed

Cost per Intelligence Index task comes from \`data/intelligence-index-costs.json\`. Time per Task and First Answer come from \`data/aa-model-speed.json\`. A dash marks a missing value in the capture.

| Configuration | AA slug | Cost per Intelligence Index task (USD) | Time per Task (s) | First Answer (s) |
| --- | --- | ---: | ---: | ---: |
${speedRows.join("\n")}
`;

// Keep the dated live observations when regenerating the stored snapshot tables.
let live = "";
if (setName === "gpt-6.2") {
  const heading = "\n## Live AA check\n";
  const previous = await readFile(report, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const start = previous?.indexOf(heading);
  if (start === -1) throw new Error(`${report}: missing Live AA check heading`);
  live = previous !== null && start !== undefined
    ? previous.slice(start)
    : heading + "\nLive verification pending.\n\n## What AA shows now that we lack\n";
}

const temporary = `${report}.${randomUUID()}.tmp`;
try {
  await writeFile(temporary, doc + live, { flag: "wx" });
  await rename(temporary, report);
} finally {
  await rm(temporary, { force: true });
}
console.log(`${setName}: ${fuzzy.length} master rows matching ${pattern}, ${filled} filled, ${absent} absent. Wrote ${report}`);
