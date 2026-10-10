import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";
import { planSharedTaskDelete, SHARED_TASK_CHANGED_MESSAGE } from "@/lib/suitability-task-deletion";
import { removeAllVersions } from "@/lib/suitability-shared-versions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ taskId: string }> };

/**
 * Soft-deletes a shared task. The document stays as a tombstone (no `active_version`, a `deleted_at` timestamp),
 * so the library and layout drop it and POST refuses to recreate it. Stored versions are purged after the commit.
 */
export async function DELETE(request: Request, context: Context) {
  const { taskId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(taskId)) return Response.json({ error: "The task ID is invalid." }, { status: 400 });
  let body: { expected_updated_at?: unknown };
  try { body = await request.json(); }
  catch { return Response.json({ error: "The delete request is invalid." }, { status: 400 }); }
  if (typeof body.expected_updated_at !== "string" || !body.expected_updated_at)
    return Response.json({ error: "The delete request is invalid." }, { status: 400 });
  const expectedUpdatedAt = body.expected_updated_at;

  try {
    const ref = adminDb().collection("sharedSuitabilityTasks").doc(taskId);
    const plan = await adminDb().runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const next = planSharedTaskDelete(snapshot.data(), expectedUpdatedAt);
      if (next === "delete") {
        transaction.update(ref, { active_version: FieldValue.delete(), deleted_at: FieldValue.serverTimestamp() });
      }
      return next;
    });
    if (plan === "not-found")
      return Response.json({ error: "This shared task could not be found." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    if (plan === "changed")
      return Response.json({ error: SHARED_TASK_CHANGED_MESSAGE }, { status: 409, headers: { "Cache-Control": "private, no-store" } });

    // The task is already hidden, so a failed purge leaves only inactive versions behind. Retrying the delete purges them.
    try { await removeAllVersions(ref); }
    catch (cleanupError) { console.error("Could not purge the deleted suitability task versions", cleanupError); }
    return Response.json({ taskId, deleted: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const quotaExceeded = (cause as { code?: number }).code === 8;
    return Response.json({ error: quotaExceeded
      ? "Firestore's quota is exhausted. The saved task was not deleted; try again when the quota resets or is increased."
      : "The saved task could not be deleted. Check the server's Firebase configuration." }, { status: 503 });
  }
}
