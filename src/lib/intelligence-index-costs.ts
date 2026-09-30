import source from "../../data/intelligence-index-costs.json";
import type { Entry, IntelligenceIndexTaskCost } from "./contract";
import { masterIdentityKey } from "./master";

type RawCostSnapshot = {
  captured_at: string;
  records: Array<{
    slug: string;
    name: string;
    provider: string;
    cost_usd: number;
    url: string;
  }>;
};

const rawSnapshot = source as RawCostSnapshot;
const snapshot = {
  captured_at: rawSnapshot.captured_at,
  records: rawSnapshot.records.map(({ name, ...record }): IntelligenceIndexTaskCost => ({
    ...record,
    model: name,
  })),
};
const costsByIdentity = new Map<string, IntelligenceIndexTaskCost | null>();
const costsByModel = new Map<string, IntelligenceIndexTaskCost | null>();

function addUnique(map: Map<string, IntelligenceIndexTaskCost | null>, key: string, cost: IntelligenceIndexTaskCost) {
  const previous = map.get(key);
  if (!map.has(key)) map.set(key, cost);
  else if (previous && previous.slug !== cost.slug) map.set(key, null);
}

for (const record of snapshot.records) {
  addUnique(costsByIdentity, masterIdentityKey(record.provider, record.model), record);
  addUnique(costsByModel, masterIdentityKey("", record.model), record);
}

export const intelligenceIndexCostCapturedAt = snapshot.captured_at;
export const intelligenceIndexCostCount = snapshot.records.length;

export function getIntelligenceIndexTaskCost(provider: string, model: string): IntelligenceIndexTaskCost | null {
  return costsByIdentity.get(masterIdentityKey(provider, model))
    ?? costsByModel.get(masterIdentityKey("", model))
    ?? null;
}

export function getIntelligenceIndexTaskCostMap(): ReadonlyMap<string, IntelligenceIndexTaskCost | null> {
  const all = new Map(costsByIdentity);
  for (const [key, cost] of costsByModel) all.set(key, cost);
  return all;
}

export function intelligenceIndexCostsForEntries(entries: Entry[]): Record<string, IntelligenceIndexTaskCost> {
  const result: Record<string, IntelligenceIndexTaskCost> = {};
  for (const entry of entries) {
    const cost = getIntelligenceIndexTaskCost(entry.provider, entry.model);
    if (cost) result[entry.id] = cost;
  }
  return result;
}
