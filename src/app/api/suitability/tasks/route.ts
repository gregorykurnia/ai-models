import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/admin";
import { savedComparisonSchema, type SavedComparison } from "@/lib/suitability-storage";
import type { SuitabilityEntry } from "@/lib/suitability";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";

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

export async function GET() {
  try {
    const snapshots = await taskCollection().get();
    const tasks: SavedComparison[] = [];
    for (const snapshot of snapshots.docs) {
      const data = snapshot.data();
      const activeVersion = data.active_version;
      if (typeof activeVersion !== "string") continue;
      const chunks = await snapshot.ref.collection("versions").doc(activeVersion).collection("entryChunks").get();
      const entries = chunks.docs.sort((a, b) => a.id.localeCompare(b.id))
        .flatMap(chunk => chunk.get("entries") as SuitabilityEntry[]);
      tasks.push(savedComparisonSchema.parse({
        task: data.task,
        evaluations: data.evaluations,
        entries,
        candidates: data.candidates,
        availableSnapshotIds: data.availableSnapshotIds,
      }));
    }
    tasks.sort((a, b) => b.task.updated_at.localeCompare(a.task.updated_at));
    return Response.json(tasks, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Saved tasks could not be loaded from the database." }, { status: 503 });
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
    if (comparison.entries.length > 25_000 || comparison.candidates.length > 5_000
      || JSON.stringify(comparison).length > 4_000_000)
      return Response.json({ error: "This task is too large to sync." }, { status: 413 });

    const ref = taskCollection().doc(taskId);
    const previous = await ref.get();
    const previousVersion = previous.data()?.active_version;
    const version = randomUUID();
    const versionRef = ref.collection("versions").doc(version);
    const chunks: SuitabilityEntry[][] = [];
    for (let start = 0; start < comparison.entries.length; start += 200)
      chunks.push(comparison.entries.slice(start, start + 200));

    await versionRef.set({ created_at: FieldValue.serverTimestamp(), chunk_count: chunks.length });
    for (let start = 0; start < chunks.length; start += 450) {
      const batch = adminDb().batch();
      chunks.slice(start, start + 450).forEach((entries, index) => {
        const chunkId = String(start + index).padStart(6, "0");
        batch.set(versionRef.collection("entryChunks").doc(chunkId), { entries });
      });
      await batch.commit();
    }

    await ref.set({
      task: comparison.task,
      evaluations: comparison.evaluations,
      candidates: comparison.candidates,
      availableSnapshotIds: comparison.availableSnapshotIds,
      active_version: version,
      saved_at: FieldValue.serverTimestamp(),
    });

    if (typeof previousVersion === "string" && previousVersion !== version) {
      try { await removeVersion(ref, previousVersion); }
      catch (cleanupError) { console.error("Could not remove the replaced suitability task version", cleanupError); }
    }

    return Response.json({ taskId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Task could not be saved to the database. Check the server's Firebase configuration." }, { status: 503 });
  }
}
