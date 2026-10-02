import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { taskId } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(taskId)) return Response.json({ error: "The task ID is invalid." }, { status: 400 });
  let body: { category_id?: unknown; expected_revision?: unknown };
  try { body = await request.json(); }
  catch { return Response.json({ error: "The category assignment is invalid." }, { status: 400 }); }
  if (!(body.category_id === null || typeof body.category_id === "string")
    || !Number.isInteger(body.expected_revision) || Number(body.expected_revision) < 0)
    return Response.json({ error: "The category assignment is invalid." }, { status: 400 });
  if (typeof body.category_id === "string" && !/^[A-Za-z0-9_-]{1,128}$/.test(body.category_id))
    return Response.json({ error: "The category ID is invalid." }, { status: 400 });

  try {
    const db = adminDb();
    const taskRef = db.collection("sharedSuitabilityTasks").doc(taskId);
    const categoryRef = body.category_id ? db.collection("sharedSuitabilityCategories").doc(body.category_id) : null;
    const now = new Date().toISOString();
    const result = await db.runTransaction(async transaction => {
      const taskSnapshot = await transaction.get(taskRef);
      if (!taskSnapshot.exists || typeof taskSnapshot.get("active_version") !== "string") throw new Error("This saved task could not be found.");
      const currentRevision = Number(taskSnapshot.get("category_revision") ?? 0);
      if (currentRevision !== body.expected_revision) throw new Error("This task's category changed in another tab. Reload the library and try again.");
      let categoryName: string | null = null;
      if (categoryRef) {
        const categorySnapshot = await transaction.get(categoryRef);
        if (!categorySnapshot.exists || categorySnapshot.get("deleted") === true) throw new Error("This category is no longer available. Reload categories and choose again.");
        categoryName = String(categorySnapshot.get("name"));
      }
      const nextRevision = currentRevision + 1;
      const task = taskSnapshot.get("task") as Record<string, unknown>;
      transaction.update(taskRef, {
        category_id: body.category_id,
        category_revision: nextRevision,
        category_updated_at: FieldValue.serverTimestamp(),
        task: { ...task, updated_at: now },
      });
      return { category_id: body.category_id, category_name: categoryName, category_revision: nextRevision, updated_at: now };
    });
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The task category could not be changed.";
    const status = /changed in another tab/.test(message) ? 409 : /not found/.test(message) ? 404 : /no longer available/.test(message) ? 409 : 503;
    return Response.json({ error: message }, { status });
  }
}
