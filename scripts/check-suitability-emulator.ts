// Runs the shared saved-task routes against the Firestore emulator: save, library, layout, delete, tombstone guard, purge.
// Usage (start the emulator first, for example `firebase emulators:start --only firestore --project demo-ai-models`):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/check-suitability-emulator.ts
// It refuses to run without FIRESTORE_EMULATOR_HOST, so it cannot reach the live database.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import type { SuitabilityTask } from "../src/lib/suitability";
import { pinComparison, type SavedComparison } from "../src/lib/suitability-storage";
import { adminDb } from "../src/lib/admin";
import * as tasks from "../src/app/api/suitability/tasks/route";
import * as task from "../src/app/api/suitability/tasks/[taskId]/route";
import * as category from "../src/app/api/suitability/tasks/[taskId]/category/route";
import * as layout from "../src/app/api/suitability/layout/route";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Set FIRESTORE_EMULATOR_HOST (for example 127.0.0.1:8080). This script never runs against the live database.");
}
process.env.FIREBASE_PROJECT_ID = "demo-ai-models";
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

const BASE = "http://localhost/api/suitability/tasks";
const json = (method: string, body: unknown, url = BASE) =>
  new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const context = (taskId: string) => ({ params: Promise.resolve({ taskId }) });
const taskRef = (id: string) => adminDb().collection("sharedSuitabilityTasks").doc(id);

async function fixture(id: string, updatedAt: string, categoryId: string | null = null): Promise<SavedComparison> {
  const dataset = JSON.parse(await readFile("data/leaderboards.json", "utf8")) as Dataset;
  const evaluations = dataset.evaluations.slice(0, 2);
  const entries = dataset.entries.filter(entry => evaluations.some(evaluation => evaluation.id === entry.evaluation_id));
  const model = entries[0];
  const data = {
    evaluations, entries,
    candidates: [{ model_id: model.model_id, model: model.model, provider: model.provider }],
    availableSnapshotIds: evaluations.map(evaluation => evaluation.published_snapshot_id),
  };
  const suitabilityTask: SuitabilityTask = {
    id, title: "Emulator check", request: "Check the shared saved-task routes",
    evaluation_weights: evaluations.map(evaluation => ({ evaluation_id: evaluation.id, weight: 50, snapshot_id: evaluation.published_snapshot_id, captured_at: evaluation.captured_at })),
    candidate_model_ids: [model.model_id], score_method: "rank_percentile_v1", missing_policy: "exclude_and_show_coverage",
    created_at: updatedAt, updated_at: updatedAt, last_calculated_at: updatedAt, schema_version: 1,
  };
  return { ...pinComparison(suitabilityTask, data), category_id: categoryId, category_name: categoryId ? "Emulator" : null };
}

async function libraryIds(): Promise<string[]> {
  const response = await tasks.GET(new Request(BASE));
  assert.equal(response.status, 200);
  return ((await response.json()) as Array<{ task: { id: string } }>).map(item => item.task.id);
}

async function layoutIds(): Promise<string[]> {
  const body = (await (await layout.GET()).json()) as { categories: Record<string, { task_ids: string[] }> };
  return Object.values(body.categories).flatMap(entry => entry.task_ids);
}

const checks: string[] = [];
const pass = (name: string) => { checks.push(name); console.log(`ok - ${name}`); };

const stamp = Date.now();
const id = `emulator-${stamp}`;
const updated = "2026-10-10T10:00:00.000Z";
const categoryId = `emulator-category-${stamp}`;
await adminDb().collection("sharedSuitabilityCategories").doc(categoryId).set({
  name: "Emulator", normalized_name: "emulator", deleted: false,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
});
const comparison = await fixture(id, updated, categoryId);

// 1. Save a new shared task and read it back.
let response = await tasks.POST(json("POST", comparison));
assert.equal(response.status, 200, "POST saves a new task");
pass("POST saves a new shared task");
assert.ok((await libraryIds()).includes(id), "library lists the live task");
response = await tasks.GET(new Request(`${BASE}?taskId=${id}`));
assert.equal(response.status, 200, "GET by ID returns the live task");
pass("library and GET by ID show the live task");

// 2. Store a layout that places the task in its category, so the layout route has something to reconcile.
// Uncategorized is not used here: its layout key "__uncategorized__" is a reserved Firestore field name, so a layout
// write for that group fails with INVALID_ARGUMENT. See the report; this check uses a regular category instead.
const stored = (await (await layout.GET()).json()) as { revision: number };
response = await layout.PATCH(json("PATCH", { type: "move", category_id: categoryId, task_ids: [id], expected_revision: stored.revision },
  "http://localhost/api/suitability/layout"));
assert.equal(response.status, 200, "layout move stores the task");
assert.ok((await layoutIds()).includes(id), "layout lists the live task");
pass("layout lists the live task");

// 3. A stale version is refused and nothing changes.
response = await task.DELETE(json("DELETE", { expected_updated_at: "2000-01-01T00:00:00.000Z" }, `${BASE}/${id}`), context(id));
assert.equal(response.status, 409, "a stale version is refused");
assert.match(((await response.json()) as { error: string }).error, /changed in another tab/);
assert.equal((await taskRef(id).get()).get("active_version") !== undefined, true, "the refused delete leaves the task live");
pass("delete with a stale version returns 409 and changes nothing");

// 4. The current version deletes: tombstone, versions purged, hidden everywhere.
const [activeVersion] = await taskRef(id).collection("versions").listDocuments();
assert.ok(activeVersion, "the saved task has one stored version");
assert.ok((await activeVersion.collection("entryChunks").get()).size >= 1, "the stored version has entry chunks");
response = await task.DELETE(json("DELETE", { expected_updated_at: updated }, `${BASE}/${id}`), context(id));
assert.equal(response.status, 200, "delete with the current version succeeds");
const tombstone = await taskRef(id).get();
assert.equal(tombstone.get("active_version"), undefined, "active_version removed");
assert.ok(tombstone.get("deleted_at"), "deleted_at set");
assert.equal((await taskRef(id).collection("versions").listDocuments()).length, 0, "every version purged");
assert.equal((await activeVersion.collection("entryChunks").get()).size, 0, "entry chunks purged with the version");
assert.equal((await libraryIds()).includes(id), false, "library hides the tombstone");
response = await tasks.GET(new Request(`${BASE}?taskId=${id}`));
assert.equal(response.status, 404, "GET by ID hides the tombstone");
assert.equal((await layoutIds()).includes(id), false, "layout drops the tombstone");
pass("delete leaves a tombstone, purges versions, and hides the task everywhere");

// 5. Saving over the tombstone is refused and leaves no version behind.
response = await tasks.POST(json("POST", comparison));
assert.equal(response.status, 409, "POST over a tombstone is refused");
assert.equal(((await response.json()) as { code?: string }).code, "task_deleted");
assert.equal(await taskRef(id).get().then(snapshot => snapshot.get("active_version")), undefined, "the refused save did not revive the task");
assert.equal((await taskRef(id).collection("versions").listDocuments()).length, 0, "the refused save cleaned up its version");
pass("POST over a tombstone returns 409 task_deleted and leaves no version");

// 6. A repeated delete succeeds without a new write; an unknown ID is 404.
response = await task.DELETE(json("DELETE", { expected_updated_at: updated }, `${BASE}/${id}`), context(id));
assert.equal(response.status, 200, "repeated delete is idempotent");
response = await task.DELETE(json("DELETE", { expected_updated_at: updated }, `${BASE}/missing-${stamp}`), context(`missing-${stamp}`));
assert.equal(response.status, 404, "unknown task is 404");
pass("repeated delete succeeds and unknown ID returns 404");

// 7. Category assignment cannot revive a tombstone.
response = await category.PATCH(json("PATCH", { category_id: null, expected_revision: 0 }, `${BASE}/${id}/category`), context(id));
assert.notEqual(response.status, 200, "category PATCH is refused for a tombstone");
pass(`category PATCH refuses a tombstone (status ${response.status})`);

// 8. Purge clears leftover versions too, the case a failed cleanup would leave behind.
const id2 = `${id}-leftover`;
const second = await fixture(id2, updated);
response = await tasks.POST(json("POST", second));
assert.equal(response.status, 200);
const leftover = taskRef(id2).collection("versions").doc("leftover-version");
const leftoverChunks = leftover.collection("entryChunks");
await leftover.set({ created_at: new Date() });
await leftover.collection("entryChunks").doc("000000").set({ entries: [] });
response = await task.DELETE(json("DELETE", { expected_updated_at: updated }, `${BASE}/${id2}`), context(id2));
assert.equal(response.status, 200);
assert.equal((await taskRef(id2).collection("versions").listDocuments()).length, 0, "leftover and active versions both purged");
assert.equal((await leftoverChunks.get()).size, 0, "leftover chunks purged");
pass("purge removes leftover versions along with the active one");

console.log(`\nAll ${checks.length} emulator checks passed.`);
