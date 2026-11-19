import { basename } from "node:path";
import { z } from "zod";
import leaderboardSource from "../../data/leaderboards.json";
import type { MasterTableRow } from "./master";
import { getPersonalityDataset, type PersonalityDataset, type PersonalityModel } from "./personality";

const { indexes } = getPersonalityDataset();
const traitKeys = new Set(indexes.flatMap(index => index.traits.map(trait => trait.key)));
const indexKeys = new Set(indexes.map(index => index.key));
const evaluationIds = new Map(leaderboardSource.evaluations.map(({ slug, id }) => [slug, id]));

function knownKey(kind: string, keys: { has: (key: string) => boolean }) {
  return z.string().refine(key => keys.has(key), {
    error: ({ input }) => `Unknown ${kind} ${JSON.stringify(input)}`,
  });
}

const aimSchema = z.enum(["high", "moderate", "low"], {
  error: ({ input }) => `Unknown aim ${JSON.stringify(input)}`,
});

const targetSchema = z.strictObject({
  trait: knownKey("trait", traitKeys).optional(),
  index: knownKey("index", indexKeys).optional(),
  aim: aimSchema,
}).transform(({ trait, index, aim }, ctx) => {
  if (trait !== undefined && index === undefined) return { trait, aim };
  if (index !== undefined && trait === undefined) return { index, aim };
  ctx.addIssue({ code: "custom", message: "Expected exactly one of trait or index" });
  return z.NEVER;
});

const nonBlankText = z.string().refine(value => value.trim().length > 0, "Expected non-blank text");

const stepSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, {
    error: ({ input }) => `Invalid step id ${JSON.stringify(input)}. Use a-z, 0-9 and -`,
  }),
  title: nonBlankText,
  goal: nonBlankText,
  targets: z.array(targetSchema).min(1, "Expected at least one target"),
  evaluations: z.array(knownKey("evaluation slug", evaluationIds)).optional(),
  other_checks: nonBlankText.optional(),
  note: nonBlankText.optional(),
});

export const workflowSchema = z.strictObject({
  slug: nonBlankText,
  title: nonBlankText,
  summary: nonBlankText,
  updated: nonBlankText,
  steps: z.array(stepSchema),
}).superRefine(({ steps }, ctx) => {
  const ids = new Set<string>();
  for (const [position, step] of steps.entries()) {
    if (ids.has(step.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["steps", position, "id"],
        message: `Duplicate step id ${JSON.stringify(step.id)}`,
      });
    }
    ids.add(step.id);
  }
});

export type Workflow = z.infer<typeof workflowSchema>;
export type WorkflowStep = Workflow["steps"][number];
export type WorkflowTarget = WorkflowStep["targets"][number];
type Aim = z.infer<typeof aimSchema>;

export function validateWorkflow(file: string, source: unknown): Workflow {
  const result = workflowSchema.safeParse(source);
  if (!result.success) throw new Error(`Invalid workflow ${file}\n${z.prettifyError(result.error)}`);

  const expectedSlug = basename(file, ".json");
  if (result.data.slug !== expectedSlug) {
    throw new Error(`Invalid workflow ${file}\nslug ${JSON.stringify(result.data.slug)} must match ${JSON.stringify(expectedSlug)}`);
  }
  return result.data;
}

export function scoreTarget(percentile: number, aim: Aim): number {
  switch (aim) {
    case "high": return percentile;
    case "low": return 100 - percentile;
    case "moderate": return 100 - 2 * Math.abs(percentile - 50);
  }
}

export function familyKey(identityKey: string): string {
  return identityKey.replace(/ \([^()]*\)$/, "");
}

export type RankedWorkflowModel = {
  model: PersonalityModel;
  percentiles: (number | null)[];
  fit: number | null;
};

export function rankStep(step: WorkflowStep, dataset: PersonalityDataset, limit = 5): RankedWorkflowModel[] {
  const rows = dataset.models.map(model => {
    const percentiles = step.targets.map(target => target.index !== undefined
      ? model.index_percentiles[target.index] ?? null
      : model.traits[target.trait]?.percentile ?? null);
    const scores = percentiles.flatMap((percentile, position) =>
      percentile === null ? [] : [scoreTarget(percentile, step.targets[position].aim)]);
    const fit = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null;
    return { model, percentiles, fit };
  });

  // The average can accumulate floating-point roundoff from each target score (0 to 100).
  const fitRoundoff = Number.EPSILON * 100 * step.targets.length;
  return rows.sort((a, b) => {
    if (a.fit !== b.fit) {
      if (a.fit === null) return 1;
      if (b.fit === null) return -1;
      const difference = b.fit - a.fit;
      if (Math.abs(difference) > fitRoundoff) return difference;
    }
    return a.model.name.localeCompare(b.model.name);
  }).slice(0, Math.max(0, limit));
}

export function stepPicks(step: WorkflowStep, dataset: PersonalityDataset) {
  const families = new Set<string>();
  const picks: RankedWorkflowModel[] = [];
  for (const row of rankStep(step, dataset, dataset.models.length)) {
    const family = familyKey(row.model.identity_key);
    if (families.has(family)) continue;
    families.add(family);
    picks.push(row);
    if (picks.length === 3) break;
  }
  return { pick: picks[0] ?? null, runnersUp: picks.slice(1) };
}

export type EvaluationRank = { rank: number; cohortSize: number };
type MasterRankRow = {
  identity_key: MasterTableRow["identity_key"];
  cells: Partial<MasterTableRow["cells"]>;
};

export function evaluationRanks(
  identityKey: string,
  evaluationSlugs: readonly string[],
  masterRows: readonly MasterRankRow[],
): Record<string, EvaluationRank | null> {
  const row = masterRows.find(candidate => candidate.identity_key === identityKey);
  return Object.fromEntries(evaluationSlugs.map(slug => {
    const id = evaluationIds.get(slug) ?? slug;
    const rank = row?.cells[id]?.entry?.source_rank;
    if (rank === undefined) return [slug, null];

    const cohortSize = masterRows.filter(candidate => candidate.cells[id]?.entry?.source_rank !== undefined).length;
    return [slug, { rank, cohortSize }];
  }));
}
