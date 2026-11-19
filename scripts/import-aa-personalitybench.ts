import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { Dataset } from "../src/lib/contract";
import { aggregateMaster, masterIdentityKey, type MasterRow } from "../src/lib/master";
import type { PersonalityDataset, PersonalityIndex, PersonalityModel } from "../src/lib/personality";
import { canonicalModelName } from "./aa-model-names";
import {
  assertCompletePersonalitySelection, personalityBenchUrl, personalityCaptureFile,
  withPersonalityBenchLock, writePersonalityBenchFiles,
} from "./capture-aa-personalitybench.mjs";

// Review upstream taxonomy changes before allowing them into the bundled data.
const indexTraits: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["expressiveness", ["lexicallyVaried", "eloquent", "literate", "naturalSounding", "metaphorical"]],
  ["organization", ["structured", "scannable", "summarizesBottomLine", "answerFirst"]],
  ["informativeness", ["informationDense", "evidenceBased", "resourceSpecific", "providesActionableGuidance", "pragmatic"]],
  ["transparency", ["truthful", "admitsUncertainty", "disclaimsWithAssumptions", "flagsNuances", "sycophantic"]],
  ["warmth", ["friendly", "humorous", "sincere", "emotionallyIntelligent"]],
  ["conviction", ["direct", "confident", "opinionated", "constructivelyPushesBack"]],
  ["imagination", ["creative", "openEnded"]],
  ["slop", ["slop"]],
];
const indexKeys = new Set(indexTraits.map(([key]) => key));
const traitKeys = new Set(indexTraits.flatMap(([, traits]) => traits));

const text = z.string().trim().min(1);
const percentiles = z.record(z.string(), z.number().min(1).max(100).nullable()).nullish();
const captureSchema = z.object({
  captured_at: z.iso.datetime(),
  source_url: z.literal(personalityBenchUrl),
  selector: text,
  index_cards: z.array(z.object({
    key: text,
    label: text,
    description: text,
    question_count: z.number().int().positive(),
    traits: z.array(text),
  })),
  traits: z.record(z.string(), z.object({ label: text, definition: text })),
  models: z.array(z.object({
    id: text,
    name: text,
    creator: z.object({ name: text }),
    judged: z.object({
      indexScores: percentiles,
      ranks: percentiles,
      scores: z.record(z.string(), z.number().nullable()).nullish(),
      cis: z.record(z.string(), z.object({ lower: z.number(), upper: z.number() }).nullable()).nullish(),
    }),
  })),
});

type Capture = z.infer<typeof captureSchema>;
type MasterIdentity = Pick<MasterRow, "provider" | "model">;

function readIndexes(capture: Capture): PersonalityIndex[] {
  if (capture.index_cards.length !== indexTraits.length) {
    throw new Error(`Expected ${indexTraits.length} PersonalityBench index cards, found ${capture.index_cards.length}`);
  }
  const missing = [...traitKeys].filter(key => !Object.hasOwn(capture.traits, key));
  const extra = Object.keys(capture.traits).filter(key => !traitKeys.has(key));
  if (missing.length || extra.length) {
    throw new Error(`PersonalityBench trait definitions changed (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"})`);
  }
  return indexTraits.map(([key, expected], position) => {
    const card = capture.index_cards[position];
    if (card.key !== key) throw new Error(`Expected PersonalityBench index ${key}, found ${card.key}`);
    if (expected.length !== card.traits.length || expected.some((trait, i) => trait !== card.traits[i])) {
      throw new Error(`PersonalityBench index ${key} traits changed (expected ${expected.join(", ")}; found ${card.traits.join(", ")})`);
    }
    return {
      ...card,
      traits: expected.map(key => ({
        key,
        ...capture.traits[key],
        lower_is_better: key === "sycophantic" || key === "slop",
        source_url: `${capture.source_url}/traits/${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`,
      })),
    };
  });
}

function readScores(name: string, judged: Capture["models"][number]["judged"]) {
  const { indexScores, ranks, scores, cis } = judged;
  for (const [field, values, allowed] of [
    ["indexScores", indexScores, indexKeys], ["ranks", ranks, traitKeys],
    ["scores", scores, traitKeys], ["cis", cis, traitKeys],
  ] as const) {
    const unexpected = Object.keys(values ?? {}).find(key => !allowed.has(key));
    if (unexpected) throw new Error(`${name}: unknown PersonalityBench key ${unexpected} in ${field}`);
  }

  const index_percentiles = Object.fromEntries([...indexKeys].map(key => [key, indexScores?.[key] ?? null]));
  const traits = Object.fromEntries([...traitKeys].map(key => {
    const elo = scores?.[key] ?? null;
    const elo_interval = cis?.[key] ?? null;
    if (elo_interval) {
      const { lower, upper } = elo_interval;
      if (lower > upper || (elo !== null && (elo < lower || elo > upper))) {
        throw new Error(`${name}: invalid Elo interval for ${key} (${elo} Elo, bounds ${lower}–${upper})`);
      }
    }
    return [key, { percentile: ranks?.[key] ?? null, elo, elo_interval }];
  }));
  return { index_percentiles, traits };
}

function missingValues(model: PersonalityModel) {
  const missing = Object.entries(model.index_percentiles).flatMap(([key, value]) => value === null ? [`${key} index percentile`] : []);
  for (const [key, score] of Object.entries(model.traits)) {
    if (score.percentile === null) missing.push(`${key} percentile`);
    if (score.elo === null) missing.push(`${key} Elo`);
    if (score.elo_interval === null) missing.push(`${key} Elo interval`);
  }
  return missing.length ? `${missing.length} (${missing.join(", ")})` : "None";
}

export function importPersonalityBench(input: unknown, master: ReadonlyMap<string, MasterIdentity>) {
  const capture = captureSchema.parse(input);
  assertCompletePersonalitySelection(capture.selector, capture.models.length);
  const indexes = readIndexes(capture);
  const identities = new Map<string, string>();
  const sourceIds = new Set<string>();
  const models: PersonalityModel[] = capture.models.map(raw => {
    const identity_key = masterIdentityKey(raw.creator.name, canonicalModelName(raw.name));
    const previous = identities.get(identity_key);
    if (previous) throw new Error(`Duplicate PersonalityBench identity for ${raw.creator.name}: ${previous} and ${raw.name}`);
    if (sourceIds.has(raw.id)) throw new Error(`Duplicate PersonalityBench source model ID ${raw.id}`);
    identities.set(identity_key, raw.name);
    sourceIds.add(raw.id);
    const match = master.get(identity_key);
    return {
      name: match?.model ?? raw.name,
      provider: match?.provider ?? raw.creator.name,
      identity_key,
      ...readScores(raw.name, raw.judged),
    };
  });
  const { captured_at, source_url } = capture;
  const dataset: PersonalityDataset = { captured_at, source_url, indexes, models };

  const matchCount = models.filter(model => master.has(model.identity_key)).length;
  const cell = (value: string) => value.replaceAll("|", "\\|").replace(/[\r\n]+/g, " ");
  const inventory = [
    "# AA-PersonalityBench capture inventory",
    "",
    `Captured ${captured_at} from [AA-PersonalityBench](${source_url}). The selector reported **${capture.selector}**.`,
    "",
    `${matchCount} of ${models.length} models match the bundled master by identity key. Missing values are listed by index or trait and measure.`,
    "",
    "| AA model | Imported name | Provider | Master match | Missing values |",
    "| --- | --- | --- | --- | --- |",
    ...models.map((model, i) => {
      const columns = [capture.models[i].name, model.name, model.provider, master.has(model.identity_key) ? "Yes" : "No", missingValues(model)];
      return `| ${columns.map(cell).join(" | ")} |`;
    }),
    "",
  ].join("\n");
  return { dataset, inventory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await withPersonalityBenchLock(async () => {
    const [raw, masterText] = await Promise.all([readFile(personalityCaptureFile, "utf8"), readFile("data/leaderboards.json", "utf8")]);
    const master = JSON.parse(masterText) as Dataset;
    const { rows } = aggregateMaster(master.evaluations, master.entries);
    const { dataset, inventory } = importPersonalityBench(JSON.parse(raw), new Map(rows.map(row => [row.identity_key, row])));
    await writePersonalityBenchFiles([
      { path: "data/aa-personalitybench.json", text: `${JSON.stringify(dataset)}\n` },
      { path: "docs/AA_PERSONALITYBENCH_CAPTURE.md", text: inventory },
    ]);
    console.log(`Imported ${dataset.models.length} PersonalityBench models across ${dataset.indexes.length} indexes and ${traitKeys.size} traits`);
  });
}
