import Planner from "@/components/suitability-planner";
import { getEntries, getEvaluations } from "@/lib/data";
import type { SuitabilityCandidate } from "@/lib/suitability";

export const dynamic = "force-dynamic";
export default async function SuitabilityPage() {
  const evaluations = await getEvaluations();
  const sourceEntries = (await Promise.all(evaluations.map(getEntries))).flat();
  const candidates = new Map<string, SuitabilityCandidate>();
  for (const entry of sourceEntries) if (!candidates.has(entry.model_id))
    candidates.set(entry.model_id, { model_id: entry.model_id, model: entry.model, provider: entry.provider });
  const entries = sourceEntries.map(({ id, evaluation_id, snapshot_id, model_id, source_rank, source_row }) =>
    ({ id, evaluation_id, snapshot_id, model_id, source_rank, source_row }));
  return <Planner data={{ evaluations, entries, candidates: [...candidates.values()].sort((a, b) => a.model.localeCompare(b.model)), availableSnapshotIds: evaluations.map(e => e.published_snapshot_id) }} />;
}
