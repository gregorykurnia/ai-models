import source from "../../data/aa-model-speed.json";
import type { Entry } from "./contract";
import { masterIdentityKey } from "./master";

export type ModelSpeed = {
  slug: string;
  model: string;
  provider: string;
  url: string;
  time_per_task_s: number | null;
  first_answer_s: number | null;
  evaluation_times_s: Record<string, number>;
  captured_at: string;
};

type RawSpeedSnapshot = {
  captured_at: string;
  records: Array<Omit<ModelSpeed, "model"> & { name: string }>;
};
const snapshot = source as RawSpeedSnapshot;
const records: ModelSpeed[] = snapshot.records.map(({ name, ...record }) => ({ ...record, model: name }));
const speedsByIdentity = new Map<string, ModelSpeed | null>();
const speedsByModel = new Map<string, ModelSpeed | null>();

function addUnique(map: Map<string, ModelSpeed | null>, key: string, speed: ModelSpeed) {
  const previous = map.get(key);
  if (!map.has(key)) map.set(key, speed);
  else if (previous && previous.slug !== speed.slug) map.set(key, null);
}

for (const record of records) {
  addUnique(speedsByIdentity, masterIdentityKey(record.provider, record.model), record);
  addUnique(speedsByModel, masterIdentityKey("", record.model), record);
}

export const modelSpeedCapturedAt = snapshot.captured_at;
export const modelSpeedCount = records.length;
export const modelSpeedCaptureLabel = new Date(snapshot.captured_at).toLocaleDateString("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});
export const modelSpeedEvaluationSlugs = [...new Set(records.flatMap(record => Object.keys(record.evaluation_times_s)))].sort();

// AA slugs in this capture: aa-briefcase, automationbench-aa, critpt-v2-hard,
// frontiercode-2-0, gdp-pdf, hle-diamond, omniscience, terminal-bench-science,
// terminalbench-4-0. Null means the page uses Intelligence Index task time.
export const evaluationSpeedSlugs: Readonly<Record<string, string | null>> = {
  "briefcase-v1-1": "aa-briefcase",
  "aa-briefcase-rubric-score": "aa-briefcase",
  "aa-briefcase-analytical-quality-elo": "aa-briefcase",
  "aa-briefcase-presentation-elo": "aa-briefcase",
  "aa-omniscience-index": "omniscience",
  "aa-omniscience-accuracy": "omniscience",
  "automationbench-aa": "automationbench-aa",
  "terminal-bench-4-0": "terminalbench-4-0",
  "frontiercode-2-0": "frontiercode-2-0",
  "gdp-pdf": "gdp-pdf",
  "hle-diamond": "hle-diamond",
  // Our CritPt is the original benchmark, not AA's CritPt v2 Hard.
  "critpt": null,
  "gdpval-aa-v2-1": null,
  "scicode": null,
  "aa-lcr-v1-1": null,
  "mmmu-pro": null,
  "finance-accounting": null,
  "economics-index": null,
  "strategy-ops-index": null,
  "intelligence-index": null,
};

export function getModelSpeed(provider: string, model: string): ModelSpeed | null {
  return speedsByIdentity.get(masterIdentityKey(provider, model))
    ?? speedsByModel.get(masterIdentityKey("", model))
    ?? null;
}

export function getModelSpeedMap(): ReadonlyMap<string, ModelSpeed | null> {
  return new Map([...speedsByIdentity, ...speedsByModel]);
}

export function modelSpeedsForEntries(entries: Entry[]): Record<string, ModelSpeed> {
  const result: Record<string, ModelSpeed> = {};
  for (const entry of entries) {
    const speed = getModelSpeed(entry.provider, entry.model);
    if (speed) result[entry.id] = speed;
  }
  return result;
}

function formatSeconds(value: number | null | undefined, divisor: number): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? (value / divisor).toFixed(1) : "—";
}

export const formatTimePerTask = (seconds: number | null | undefined) => formatSeconds(seconds, 60);
export const formatFirstAnswer = (seconds: number | null | undefined) => formatSeconds(seconds, 1);
