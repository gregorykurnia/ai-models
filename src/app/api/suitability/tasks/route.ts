import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/admin";
import { calculateSuitability, suitabilityTaskSchema, type SuitabilityEntry } from "@/lib/suitability";
import { savedComparisonSchema, savedTaskSummarySchema, type SavedComparison, type SavedTaskSummary } from "@/lib/suitability-storage";
import { FieldValue, type DocumentReference, type DocumentSnapshot } from "firebase-admin/firestore";
import { masterIdentityKey } from "@/lib/master";
import { getIntelligenceIndexTaskCost, getIntelligenceIndexTaskCostCapturedAt } from "@/lib/intelligence-index-costs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const taskCollection = () => adminDb().collection("sharedSuitabilityTasks");

async function removeVersion(taskRef: DocumentReference, version: string) {
  const versionRef = taskRef.collection("versions").doc(version);
  const chunks = await versionRef.collection("entryChunks").get();
  for (let start = 0; start < chunks.docs.length; start += 450) {
    const batch = adminDb().batch();
    chunks.docs.slice(start, start + 450).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  await versionRef.delete();
}

async function readComparison(snapshot: DocumentSnapshot): Promise<SavedComparison> {
  const data = snapshot.data()!;
  const activeVersion = data.active_version;
  if (typeof activeVersion !== "string") throw new Error("The saved task has no active data version.");
  const chunks = await snapshot.ref.collection("versions").doc(activeVersion).collection("entryChunks").get();
  const entries = chunks.docs.sort((a, b) => a.id.localeCompare(b.id))
    .flatMap(chunk => chunk.get("entries") as SuitabilityEntry[]);
  const comparison = savedComparisonSchema.parse({
    task: data.task,
    category_id: data.category_id ?? null,
    category_name: data.category_name ?? null,
    category_revision: data.category_revision ?? 0,
    evaluations: data.evaluations,
    entries,
    candidates: data.candidates,
    availableSnapshotIds: data.availableSnapshotIds,
  });
  let migrated = false;
  comparison.candidates = comparison.candidates.map(candidate => {
    const identity_key = candidate.identity_key ?? masterIdentityKey(candidate.provider, candidate.model);
    let intelligence_index_cost = candidate.intelligence_index_cost;
    if (intelligence_index_cost === undefined) {
      const cost = getIntelligenceIndexTaskCost(candidate.provider, candidate.model);
      intelligence_index_cost = cost ? { slug: cost.slug, cost_usd: cost.cost_usd, url: cost.url, captured_at: getIntelligenceIndexTaskCostCapturedAt() } : null;
      migrated = true;
    }
    if (!candidate.identity_key) migrated = true;
    return { ...candidate, identity_key, intelligence_index_cost };
  });
  if (migrated) await snapshot.ref.update({ candidates: comparison.candidates });
  return comparison as SavedComparison;
}

export async function GET(request: Request) {
  try {
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (taskId !== null) {
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(taskId)) return Response.json({ error: "The task ID is invalid." }, { status: 400 });
      const snapshot = await taskCollection().doc(taskId).get();
      if (!snapshot.exists || typeof snapshot.data()?.active_version !== "string")
        return Response.json({ error: "This shared task could not be found." }, { status: 404 });
      const comparison = await readComparison(snapshot);
      return Response.json(comparison, { headers: { "Cache-Control": "private, no-store" } });
    }

    const snapshots = await taskCollection().get();
    const tasks: SavedTaskSummary[] = [];
    for (const snapshot of snapshots.docs) {
      const data = snapshot.data();
      if (typeof data.active_version !== "string") continue;
      const task = suitabilityTaskSchema.parse(data.task);
      tasks.push(savedTaskSummarySchema.parse({
        task: {
          id: task.id,
          title: task.title,
          request: task.request,
          evaluation_weights: task.evaluation_weights,
          created_at: task.created_at,
          updated_at: task.updated_at,
          category_id: data.category_id ?? null,
          category_name: data.category_name ?? null,
          category_revision: data.category_revision ?? 0,
        },
        candidate_count: task.candidate_model_ids.length,
        evaluations: data.evaluations,
        preview: data.preview ?? null,
      }));
    }
    tasks.sort((a, b) => b.task.updated_at.localeCompare(a.task.updated_at));
    return Response.json(tasks, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const quotaExceeded=(cause as {code?:number}).code===8;
    return Response.json({ error: quotaExceeded
      ? "Firestore's read quota is exhausted. Shared saved tasks are temporarily unavailable until the quota resets or is increased."
      : "Saved tasks could not be loaded from the database." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const input: unknown = await request.json();
    const parsed = savedComparisonSchema.safeParse(input);
    if (!parsed.success) return Response.json({ error: "The saved task data is invalid." }, { status: 400 });

    const comparison = parsed.data;
    const taskId = comparison.task.id;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(taskId))
      return Response.json({ error: "The task ID is invalid." }, { status: 400 });
    if (comparison.category_id && !/^[A-Za-z0-9_-]{1,128}$/.test(comparison.category_id))
      return Response.json({ error: "The category ID is invalid." }, { status: 400 });
    if (comparison.entries.length > 25_000 || comparison.candidates.length > 5_000
      || JSON.stringify(comparison).length > 4_000_000)
      return Response.json({ error: "This task is too large to sync." }, { status: 413 });

    const ref = taskCollection().doc(taskId);
    const version = randomUUID();
    const versionRef = ref.collection("versions").doc(version);
    const chunks: SuitabilityEntry[][] = [];
    for (let start = 0; start < comparison.entries.length; start += 200)
      chunks.push(comparison.entries.slice(start, start + 200));

    const leadingCandidate = calculateSuitability({
      evaluations: comparison.evaluations,
      entries: comparison.entries,
      weights: comparison.task.evaluation_weights,
      candidates: comparison.candidates.filter(candidate => comparison.task.candidate_model_ids.includes(candidate.model_id)),
      availableSnapshotIds: comparison.availableSnapshotIds,
    })[0];
    const preview = leadingCandidate ? {
      model_id: leadingCandidate.model_id,
      model: leadingCandidate.model,
      provider: leadingCandidate.provider,
      score: leadingCandidate.score,
      intelligence_index_cost: leadingCandidate.intelligence_index_cost ?? null,
    } : null;

    await versionRef.set({ created_at: FieldValue.serverTimestamp(), chunk_count: chunks.length });
    for (let start = 0; start < chunks.length; start += 450) {
      const batch = adminDb().batch();
      chunks.slice(start, start + 450).forEach((entries, index) => {
        const chunkId = String(start + index).padStart(6, "0");
        batch.set(versionRef.collection("entryChunks").doc(chunkId), { entries });
      });
      await batch.commit();
    }

    let previousVersion: unknown;
    let savedCategoryRevision = 0;
    let savedCategoryName: string | null = null;
    try {
      await adminDb().runTransaction(async transaction => {
        const existing = await transaction.get(ref);
        const previousData = existing.data();
        const currentRevision = Number(previousData?.category_revision ?? 0);
        if (existing.exists && currentRevision !== Number(comparison.category_revision ?? 0))
          throw new Error("This task's category changed while you were editing. Reload the comparison and try again.");
        const categoryId = comparison.category_id ?? null;
        const categoryRef = categoryId ? adminDb().collection("sharedSuitabilityCategories").doc(categoryId) : null;
        let categoryName: string | null = null;
        if (categoryRef) {
          const category = await transaction.get(categoryRef);
          if (!category.exists || category.get("deleted") === true)
            throw new Error("This category is no longer available. Reload categories and choose again.");
          categoryName = String(category.get("name"));
        }
        previousVersion = previousData?.active_version;
        const nextRevision = currentRevision + (existing.exists && categoryId === (previousData?.category_id ?? null) ? 0 : 1);
        savedCategoryRevision = nextRevision;
        savedCategoryName = categoryName;
        transaction.set(ref, {
          task: comparison.task,
          category_id: categoryId,
          category_name: categoryName,
          category_revision: nextRevision,
          evaluations: comparison.evaluations,
          candidates: comparison.candidates,
          availableSnapshotIds: comparison.availableSnapshotIds,
          preview,
          active_version: version,
          saved_at: FieldValue.serverTimestamp(),
        });
      });
    } catch (cause) {
      try { await removeVersion(ref, version); } catch { /* An orphaned inactive version is safe and can be cleaned later. */ }
      throw cause;
    }

    if (typeof previousVersion === "string" && previousVersion !== version) {
      try { await removeVersion(ref, previousVersion); }
      catch (cleanupError) { console.error("Could not remove the replaced suitability task version", cleanupError); }
    }

    return Response.json({ taskId, category_revision: savedCategoryRevision, category_name: savedCategoryName }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const quotaExceeded=(cause as {code?:number}).code===8;
    if (cause instanceof Error && /category changed|category is no longer available/.test(cause.message))
      return Response.json({ error: cause.message }, { status: 409 });
    return Response.json({ error: quotaExceeded
      ? "Firestore's quota is exhausted. Your selections are still visible; shared saves can resume when the quota resets or is increased."
      : "Task could not be saved to the database. Check the server's Firebase configuration." }, { status: 503 });
  }
}
