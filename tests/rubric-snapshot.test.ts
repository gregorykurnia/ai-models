import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import type { Dataset } from "../src/lib/contract";
import { mergeBriefcaseComponents, type BriefcaseComponentsSource } from "../src/lib/aa-briefcase";
import { mergeAaModelProfileOverlays, type AaModelProfileOverlay } from "../src/lib/aa-model-profile-overlays";
import { mergeBriefcaseRubricRefresh, type BriefcaseRubricRefreshSource } from "../src/lib/aa-briefcase-rubric-refresh";
import { buildPlannerData } from "../src/lib/suitability-data";

// Uses the bundled data the same way src/lib/data.ts does, so the planner and master read one cohort.
const load = async <T>(file: string) => JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8")) as T;

test("AA-Briefcase rubric planner cohort keeps supplemental profile rows on the published snapshot", async () => {
  const merged = mergeBriefcaseRubricRefresh(
    mergeAaModelProfileOverlays(
      mergeBriefcaseComponents(await load<Dataset>("leaderboards.json"), await load<BriefcaseComponentsSource>("aa-briefcase-components.json")),
      await load<AaModelProfileOverlay>("aa-model-profile-overlays.json")),
    await load<BriefcaseRubricRefreshSource>("aa-briefcase-rubric-refresh.json"));

  const rubric = merged.evaluations.find(evaluation => evaluation.id === "aa-briefcase-rubric-score")!;
  const planner = buildPlannerData(merged.evaluations, merged.entries);
  const plannerRows = planner.entries.filter(entry => entry.evaluation_id === rubric.id);

  assert.equal(plannerRows.length, rubric.row_count);
  assert.ok(plannerRows.every(entry => entry.snapshot_id === rubric.published_snapshot_id));
  const haiku = plannerRows.find(entry => entry.model === "Claude Haiku 5.5 (Adaptive Reasoning, High Effort, Default Fallback)");
  assert.ok(haiku, "Haiku 5.5 High rubric row is missing from the planner cohort");
  assert.equal(haiku.source_rank, merged.entries.find(entry => entry.id === haiku.id)!.source_rank);
});
