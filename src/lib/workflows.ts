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
const updatedDate = z.iso.date({ error: ({ input }) => `Invalid date ${JSON.stringify(input)}. Use YYYY-MM-DD` });

export const modelListSchema = z.strictObject({
  updated: updatedDate,
  providers: z.array(nonBlankText),
  models: z.array(z.strictObject({ label: nonBlankText, family: nonBlankText })),
});

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
  updated: updatedDate,
  steps: z.array(stepSchema),
}).superRefine(({ steps }, ctx) => {
  const ids = new Set<string>();
  for (const [position, step] of steps.entries()) {
    const targetKeys = new Set<string>();
    for (const [targetPosition, target] of step.targets.entries()) {
      const key = target.index !== undefined ? `index ${target.index}` : `trait ${target.trait}`;
      if (targetKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["steps", position, "targets", targetPosition],
          message: `Duplicate target ${JSON.stringify(key)}`,
        });
      }
      targetKeys.add(key);
    }
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
export type WorkflowModelList = z.infer<typeof modelListSchema>;
type Aim = z.infer<typeof aimSchema>;

export function validateModelList(file: string, source: unknown): WorkflowModelList {
  const result = modelListSchema.safeParse(source);
  if (!result.success) throw new Error(`Invalid model list ${file}\n${z.prettifyError(result.error)}`);
  return result.data;
}

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

export function onList(model: Pick<PersonalityModel, "provider" | "identity_key">, list: WorkflowModelList): boolean {
  const family = familyKey(model.identity_key).replace("\u0000", " ");
  return list.providers.includes(model.provider) || list.models.some(entry => entry.family === family);
}

export const BENCHMARK_BAR = 0.25;

export function barRank(cohortSize: number): number {
  return Math.max(1, Math.floor(cohortSize * BENCHMARK_BAR));
}

export type RankedWorkflowModel = {
  model: PersonalityModel;
  percentiles: (number | null)[];
  fit: number | null;
};

function compareFit(a: number | null, b: number | null, targetCount: number): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  // The average can accumulate floating-point roundoff from each target score (0 to 100).
  const difference = b - a;
  return Math.abs(difference) > Number.EPSILON * 100 * targetCount ? difference : 0;
}

function scoreStep(step: WorkflowStep, dataset: PersonalityDataset): RankedWorkflowModel[] {
  const rows = dataset.models.map(model => {
    const percentiles = step.targets.map(target => target.index !== undefined
      ? model.index_percentiles[target.index] ?? null
      : model.traits[target.trait]?.percentile ?? null);
    const scores = percentiles.flatMap((percentile, position) =>
      percentile === null ? [] : [scoreTarget(percentile, step.targets[position].aim)]);
    const fit = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null;
    return { model, percentiles, fit };
  });

  return rows.sort((a, b) => compareFit(a.fit, b.fit, step.targets.length) || a.model.name.localeCompare(b.model.name));
}

function firstThreeFamilies<T extends RankedWorkflowModel>(rows: T[]): T[] {
  const families = new Set<string>();
  const picks: T[] = [];
  for (const row of rows) {
    const family = familyKey(row.model.identity_key);
    if (families.has(family)) continue;
    families.add(family);
    picks.push(row);
    if (picks.length === 3) break;
  }
  return picks;
}

export function rankStep(
  step: WorkflowStep,
  dataset: PersonalityDataset,
  list: WorkflowModelList,
  masterRows: readonly MasterRankRow[],
  limit = 5,
): RankedWorkflowModel[] {
  const { candidates } = assessStep(step, dataset, list, masterRows);
  return candidates.filter(canPick).slice(0, Math.max(0, limit)).map(({ row }) => row);
}

export function stepPicks(
  step: WorkflowStep,
  dataset: PersonalityDataset,
  list: WorkflowModelList,
  masterRows: readonly MasterRankRow[],
) {
  const picks = firstThreeFamilies(rankStep(step, dataset, list, masterRows, dataset.models.length));
  return { pick: picks[0] ?? null, runnersUp: picks.slice(1) };
}

export function stepNotes(
  step: WorkflowStep,
  dataset: PersonalityDataset,
  list: WorkflowModelList,
  masterRows: readonly MasterRankRow[],
) {
  const { candidates, skippedEvaluations } = assessStep(step, dataset, list, masterRows);
  const pick = candidates.find(canPick)?.row;
  const noteCandidates = pick
    ? candidates.filter(({ row }) => compareFit(row.fit, pick.fit, step.targets.length) < 0)
    : candidates.filter(({ listed }) => listed);
  const belowBar = firstThreeFamilies(noteCandidates
    .filter(({ missedEvaluations }) => missedEvaluations.length > 0)
    .map(({ row, missedEvaluations }) => ({ ...row, missedEvaluations })));
  const notOnList = pick ? firstThreeFamilies(noteCandidates
    .filter(({ listed, missedEvaluations }) => !listed && missedEvaluations.length === 0)
    .map(({ row }) => row)) : [];
  return { belowBar, notOnList, skippedEvaluations };
}

export type EvaluationRank = { rank: number; cohortSize: number };
type MasterRankRow = {
  identity_key: MasterTableRow["identity_key"];
  cells: Partial<MasterTableRow["cells"]>;
};

function evaluationCohortSize(id: string, masterRows: readonly MasterRankRow[]): number {
  return masterRows.filter(row => row.cells[id]?.entry?.source_rank !== undefined).length;
}

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

    return [slug, { rank, cohortSize: evaluationCohortSize(id, masterRows) }];
  }));
}

type MissedEvaluation = { slug: string; rank: number | null; cohortSize: number; barRank: number };
type StepCandidate = { row: RankedWorkflowModel; listed: boolean; missedEvaluations: MissedEvaluation[] };

function canPick({ listed, missedEvaluations }: StepCandidate): boolean {
  return listed && missedEvaluations.length === 0;
}

function assessStep(
  step: WorkflowStep,
  dataset: PersonalityDataset,
  list: WorkflowModelList,
  masterRows: readonly MasterRankRow[],
) {
  const evaluations = [...new Set(step.evaluations)].map(slug => {
    const id = evaluationIds.get(slug) ?? slug;
    const cohortSize = evaluationCohortSize(id, masterRows);
    return { slug, id, cohortSize, barRank: barRank(cohortSize) };
  });
  const activeEvaluations = evaluations.filter(({ cohortSize }) => cohortSize > 0);
  const skippedEvaluations = evaluations.filter(({ cohortSize }) => cohortSize === 0).map(({ slug }) => slug);
  const candidates = scoreStep(step, dataset).map((row): StepCandidate => {
    const masterRow = masterRows.find(candidate => candidate.identity_key === row.model.identity_key);
    const missedEvaluations = activeEvaluations.flatMap(({ slug, id, cohortSize, barRank }) => {
      const rank = masterRow?.cells[id]?.entry?.source_rank ?? null;
      return rank !== null && rank <= barRank ? [] : [{ slug, rank, cohortSize, barRank }];
    });
    return { row, listed: onList(row.model, list), missedEvaluations };
  });
  return { candidates, skippedEvaluations };
}
