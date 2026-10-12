import { calculateSuitability, suitabilityTaskSchema, type SuitabilityEntry } from "./suitability";
import { buildPlannerData } from "./suitability-data";
import { pinComparison } from "./suitability-storage";
import { masterIdentityKey } from "./master";
import type { Entry, Evaluation } from "./contract";

/** Saved candidates whose model AA now lists under one current row. Add a pair when a model is renamed. */
export const identityAliases = new Map<string, string>([
  // Gemini 3.6 Flash has one current variant, (High).
  [masterIdentityKey("Google", "Gemini 3.6 Flash"), masterIdentityKey("Google", "Gemini 3.6 Flash (High)")],
]);

export type StoredTask = {
  id: string;
  /** The shared task document without its entries. */
  top: Record<string, any>;
  /** Entries pinned in the active version. */
  entries: SuitabilityEntry[];
};

/** How many saved candidate-evaluation ranks changed when a task moved to the latest data. */
export type CellChanges = { gained: number; lost: number; changed: number; same: number };

export type RefreshPlan =
  | { id: string; title: string; status: "skipped" | "current" | "blocked"; reason: string }
  | {
      id: string; title: string; status: "refresh"; reason: string; activeVersion: string;
      task: Record<string, any>; evaluations: Evaluation[]; candidates: any[]; entries: SuitabilityEntry[];
      availableSnapshotIds: string[]; preview: unknown; changes: CellChanges | null;
    };

/** Pure planning: decides for each saved task whether it moves to the latest data, is already there, or is blocked. */
export function planSavedTaskRefresh(input: { evaluations: Evaluation[]; entries: Entry[]; tasks: StoredTask[]; now: string }): RefreshPlan[] {
  const data: any = buildPlannerData(input.evaluations, input.entries);
  return input.tasks.map(stored => planOne(stored, input.evaluations, data, input.now));
}

function planOne(stored: StoredTask, evaluations: Evaluation[], data: any, now: string): RefreshPlan {
  const { top } = stored;
  const base = { id: stored.id, title: String(top.task?.title ?? stored.id).slice(0, 80) };
  if (top.deleted_at || top.deleted) return { ...base, status: "skipped", reason: "deleted" };

  const current = new Map(evaluations.map(evaluation => [evaluation.id, evaluation]));
  const weights: any[] = top.task.evaluation_weights;
  const unpublished = weights.find(weight => !current.has(weight.evaluation_id));
  if (unpublished) return { ...base, status: "blocked", reason: `evaluation ${unpublished.evaluation_id} is no longer published` };
  if (weights.every(weight => weight.snapshot_id === current.get(weight.evaluation_id)!.published_snapshot_id))
    return { ...base, status: "current", reason: "already on the latest data" };

  const storedCandidates = new Map<string, any>((top.candidates ?? []).map((candidate: any) => [candidate.model_id, candidate]));
  const candidateByIdentity = new Map<string, any>(data.candidates.map((candidate: any) => [candidate.identity_key, candidate]));
  const newIds: string[] = [];
  const idMap = new Map<string, string>();
  for (const oldId of top.task.candidate_model_ids as string[]) {
    const saved = storedCandidates.get(oldId);
    if (!saved) return { ...base, status: "blocked", reason: `saved candidate ${oldId} is missing from the task` };
    const identity = saved.identity_key ?? masterIdentityKey(saved.provider, saved.model);
    const latest = candidateByIdentity.get(identityAliases.get(identity) ?? identity);
    if (!latest) return { ...base, status: "blocked", reason: `${saved.provider} | ${saved.model} is not on the latest leaderboards; add an alias` };
    idMap.set(oldId, latest.model_id);
    if (!newIds.includes(latest.model_id)) newIds.push(latest.model_id);
  }

  const nextWeights = weights.map(weight => ({
    evaluation_id: weight.evaluation_id,
    weight: weight.weight,
    snapshot_id: current.get(weight.evaluation_id)!.published_snapshot_id,
    captured_at: current.get(weight.evaluation_id)!.captured_at,
  }));
  const task = {
    ...top.task,
    evaluation_weights: nextWeights,
    candidate_model_ids: newIds,
    implementor_model_id: top.task.implementor_model_id ? idMap.get(top.task.implementor_model_id) ?? null : null,
    updated_at: now,
    last_calculated_at: now,
  };
  try {
    suitabilityTaskSchema.parse(task);
  } catch (error) {
    return { ...base, status: "blocked", reason: `invalid task: ${(error as Error).message.slice(0, 120)}` };
  }

  const pinned: any = pinComparison(task as any, data);
  if (pinned.candidates.length !== newIds.length) return { ...base, status: "blocked", reason: "some candidates did not resolve on the latest data" };
  const results = calculateSuitability({
    evaluations: pinned.evaluations, entries: pinned.entries, weights: task.evaluation_weights,
    candidates: pinned.candidates, availableSnapshotIds: pinned.availableSnapshotIds,
  });
  return {
    ...base,
    status: "refresh",
    reason: "moves to the latest data",
    activeVersion: String(top.active_version),
    task,
    evaluations: pinned.evaluations,
    candidates: pinned.candidates,
    entries: pinned.entries,
    availableSnapshotIds: pinned.availableSnapshotIds,
    preview: previewOf(task, results),
    changes: compareRanks(top, stored.entries, results, nextWeights),
  };
}

/** Same preview the save route stores: the implementor if set, otherwise the first candidate. */
function previewOf(task: Record<string, any>, results: any[]) {
  const found = (task.implementor_model_id ? results.find(candidate => candidate.model_id === task.implementor_model_id) : null) ?? results[0];
  return found ? { model_id: found.model_id, model: found.model, provider: found.provider, score: found.score, intelligence_index_cost: found.intelligence_index_cost ?? null } : null;
}

/** Compares each candidate's rank per evaluation before and after the move, matching candidates by identity. */
function compareRanks(top: Record<string, any>, oldEntries: SuitabilityEntry[], results: any[], weights: any[]): CellChanges | null {
  let before: any[];
  try {
    before = calculateSuitability({
      evaluations: top.evaluations, entries: oldEntries, weights: top.task.evaluation_weights,
      candidates: (top.candidates ?? []).filter((candidate: any) => top.task.candidate_model_ids.includes(candidate.model_id)),
      availableSnapshotIds: top.availableSnapshotIds ?? [],
    });
  } catch {
    return null;
  }
  const latestRanks = new Map<string, Map<string, number | null>>(results.map(result => [
    result.identity_key as string,
    new Map<string, number | null>(result.breakdown.map((item: any) => [item.evaluation_id, item.source_rank ?? null])),
  ]));
  const changes: CellChanges = { gained: 0, lost: 0, changed: 0, same: 0 };
  for (const result of before) {
    const identity = result.identity_key ?? masterIdentityKey(result.provider, result.model);
    const key = identityAliases.get(identity) ?? identity;
    const previous = new Map<string, number | null>(result.breakdown.map((item: any) => [item.evaluation_id, item.source_rank ?? null]));
    for (const weight of weights) {
      const was = previous.get(weight.evaluation_id) ?? null;
      const now = latestRanks.get(key)?.get(weight.evaluation_id) ?? null;
      if (was === null && now === null) continue;
      if (was === null) changes.gained++;
      else if (now === null) changes.lost++;
      else if (was === now) changes.same++;
      else changes.changed++;
    }
  }
  return changes;
}
