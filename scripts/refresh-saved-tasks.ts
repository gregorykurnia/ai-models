// Re-pins every shared saved suitability task to the published leaderboard data.
// publish:data runs this after a successful publish. By hand, run `npm run refresh:saved-tasks` for a dry run,
// or add -- --apply to write. Each refreshed task gets a new version; the newest three versions are kept.
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/admin";
import type { Entry, Evaluation } from "../src/lib/contract";
import { planSavedTaskRefresh, type CellChanges, type RefreshPlan, type StoredTask } from "../src/lib/saved-task-refresh";

const CHUNK = 200;
const BATCH = 450;
/** The active version plus the two most recent before it. */
const VERSIONS_KEPT = 3;

export type RefreshResult = {
  apply: boolean;
  plans: RefreshPlan[];
  refreshed: number;
  failures: { id: string; title: string; reason: string }[];
};

const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const millis = (doc: { get: (field: string) => any }) => doc.get("created_at")?.toMillis?.() ?? 0;

async function loadPublished(db: Firestore) {
  const evaluations = (await db.collection("evaluations").get()).docs.map(doc => doc.data() as Evaluation).filter(evaluation => !!evaluation.published_snapshot_id);
  const entries: Entry[] = [];
  for (const evaluation of evaluations) {
    const snapshot = await db.collection("snapshots").doc(evaluation.published_snapshot_id).collection("entries").get();
    entries.push(...snapshot.docs.map(doc => doc.data() as Entry));
  }
  return { evaluations, entries };
}

async function loadTasks(db: Firestore) {
  const refs = new Map<string, DocumentReference>();
  const tasks: StoredTask[] = [];
  for (const doc of (await db.collection("sharedSuitabilityTasks").get()).docs) {
    const top = doc.data();
    if (!top.task) continue;
    const chunks = top.active_version
      ? (await doc.ref.collection("versions").doc(String(top.active_version)).collection("entryChunks").get()).docs
      : [];
    chunks.sort((a, b) => a.id.localeCompare(b.id));
    refs.set(doc.id, doc.ref);
    tasks.push({ id: doc.id, top, entries: chunks.flatMap(chunk => (chunk.get("entries") ?? []) as any[]) });
  }
  return { tasks, refs };
}

async function deleteVersion(db: Firestore, ref: DocumentReference, versionId: string) {
  const versionRef = ref.collection("versions").doc(versionId);
  const chunks = (await versionRef.collection("entryChunks").get()).docs;
  for (let start = 0; start < chunks.length; start += BATCH) {
    const batch = db.batch();
    chunks.slice(start, start + BATCH).forEach(chunk => batch.delete(chunk.ref));
    await batch.commit();
  }
  await versionRef.delete();
}

async function pruneVersions(db: Firestore, ref: DocumentReference, activeVersion: string) {
  const others = (await ref.collection("versions").get()).docs
    .filter(doc => doc.id !== activeVersion)
    .sort((a, b) => millis(b) - millis(a));
  for (const doc of others.slice(VERSIONS_KEPT - 1)) await deleteVersion(db, ref, doc.id);
}

async function writePlan(db: Firestore, ref: DocumentReference, plan: Extract<RefreshPlan, { status: "refresh" }>) {
  const versionId = randomUUID();
  const versionRef = ref.collection("versions").doc(versionId);
  const chunkCount = Math.ceil(plan.entries.length / CHUNK);
  await versionRef.set({ created_at: FieldValue.serverTimestamp(), chunk_count: chunkCount });
  for (let start = 0; start < chunkCount; start += BATCH) {
    const batch = db.batch();
    for (let index = start; index < Math.min(chunkCount, start + BATCH); index++) {
      batch.set(versionRef.collection("entryChunks").doc(String(index).padStart(6, "0")), { entries: plain(plan.entries.slice(index * CHUNK, (index + 1) * CHUNK)) });
    }
    await batch.commit();
  }
  try {
    await db.runTransaction(async transaction => {
      const current = await transaction.get(ref);
      if (!current.exists) throw new Error("the task was deleted during the refresh");
      if (current.get("active_version") !== plan.activeVersion) throw new Error("the task was saved during the refresh");
      transaction.update(ref, {
        task: plain(plan.task),
        evaluations: plain(plan.evaluations),
        candidates: plain(plan.candidates),
        availableSnapshotIds: plan.availableSnapshotIds,
        preview: plain(plan.preview),
        active_version: versionId,
        saved_at: FieldValue.serverTimestamp(),
        // A stale editor who opened the task before this refresh fails its next save and reloads, instead of writing old pins back.
        category_revision: Number(current.get("category_revision") ?? 0) + 1,
      });
    });
  } catch (error) {
    await deleteVersion(db, ref, versionId).catch(() => undefined);
    throw error;
  }
  await pruneVersions(db, ref, versionId);
}

export async function refreshSavedTasks({ apply, db = adminDb(), now = new Date().toISOString() }: { apply: boolean; db?: Firestore; now?: string }): Promise<RefreshResult> {
  const { evaluations, entries } = await loadPublished(db);
  const { tasks, refs } = await loadTasks(db);
  const plans = planSavedTaskRefresh({ evaluations, entries, tasks, now });
  const failures: RefreshResult["failures"] = [];
  let refreshed = 0;
  if (apply) {
    for (const plan of plans) {
      if (plan.status !== "refresh") continue;
      try {
        await writePlan(db, refs.get(plan.id)!, plan);
        refreshed++;
      } catch (error) {
        failures.push({ id: plan.id, title: plan.title, reason: (error as Error).message });
      }
    }
  }
  return { apply, plans, refreshed, failures };
}

/** Whether a run left anything unrefreshed, so the caller can exit non-zero. */
export function needsAttention(result: RefreshResult) {
  return result.failures.length > 0 || result.plans.some(plan => plan.status === "blocked");
}

export function printRefresh(result: RefreshResult) {
  const count = (status: RefreshPlan["status"]) => result.plans.filter(plan => plan.status === status).length;
  const pending = count("refresh");
  console.log(`saved tasks: ${result.plans.length} | ${result.apply ? `refreshed ${result.refreshed}` : `would refresh ${pending} (dry run, nothing written)`}`
    + ` | already current ${count("current")} | skipped ${count("skipped")} | blocked ${count("blocked")} | failed ${result.failures.length}`);
  const changes = result.plans.flatMap(plan => plan.status === "refresh" && plan.changes ? [plan.changes] : []);
  const total = (key: keyof CellChanges) => changes.reduce((sum, change) => sum + change[key], 0);
  console.log(`rank cells: ${total("gained")} filled (Not ranked before), ${total("changed")} moved, ${total("same")} unchanged, ${total("lost")} lost`);
  for (const plan of result.plans) if (plan.status === "blocked") console.log(`  blocked ${plan.title}: ${plan.reason}`);
  for (const failure of result.failures) console.log(`  failed ${failure.title}: ${failure.reason}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await refreshSavedTasks({ apply: process.argv.includes("--apply") });
  printRefresh(result);
  process.exitCode = needsAttention(result) ? 1 : 0;
}
