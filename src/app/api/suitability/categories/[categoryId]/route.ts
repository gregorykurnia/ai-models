import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";
import { validateCategoryName } from "@/lib/suitability-categories";
import { suitabilityCategorySchema } from "@/lib/suitability-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ categoryId: string }> };

const categories = () => adminDb().collection("sharedSuitabilityCategories");
const nameKeys = () => adminDb().collection("sharedSuitabilityCategoryNames");
const keyFor = (name: string) => createHash("sha256").update(name).digest("hex");
const validId = (id: string) => /^[A-Za-z0-9_-]{1,128}$/.test(id);

export async function PATCH(request: Request, context: Context) {
  const { categoryId } = await context.params;
  if (!validId(categoryId)) return Response.json({ error: "The category ID is invalid." }, { status: 400 });
  try {
    let body: { name?: unknown };
    try { body = await request.json(); }
    catch { return Response.json({ error: "Enter a category name." }, { status: 400 }); }
    const { name, normalizedName } = validateCategoryName(body.name);
    const db = adminDb();
    const ref = categories().doc(categoryId);
    const nextKey = nameKeys().doc(keyFor(normalizedName));
    const now = new Date().toISOString();
    const updated = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.get("deleted") === true) throw new Error("This category no longer exists. Reload categories and try again.");
      const oldName = String(snapshot.get("normalized_name") ?? "");
      if (oldName !== normalizedName) {
        const key = await transaction.get(nextKey);
        if (key.exists && key.get("category_id") !== categoryId) throw new Error("A category with this name already exists.");
        transaction.delete(nameKeys().doc(keyFor(oldName)));
        transaction.set(nextKey, { category_id: categoryId, created_at: FieldValue.serverTimestamp() });
      }
      transaction.update(ref, { name, normalized_name: normalizedName, updated_at: now });
      return suitabilityCategorySchema.parse({ id: categoryId, name, normalized_name: normalizedName, created_at: snapshot.get("created_at"), updated_at: now });
    });
    return Response.json(updated, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Category could not be renamed.";
    const status = /already exists/.test(message) ? 409 : /reserved|60 characters|Enter a category/.test(message) ? 400 : /no longer exists/.test(message) ? 404 : 503;
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { categoryId } = await context.params;
  if (!validId(categoryId)) return Response.json({ error: "The category ID is invalid." }, { status: 400 });
  try {
    const db = adminDb();
    const ref = categories().doc(categoryId);
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.get("deleted") === true) throw new Error("This category was already removed.");
      const normalizedName = String(snapshot.get("normalized_name") ?? "");
      transaction.update(ref, { deleted: true, deleted_at: FieldValue.serverTimestamp(), updated_at: new Date().toISOString() });
      transaction.delete(nameKeys().doc(keyFor(normalizedName)));
    });
    return Response.json({ categoryId, category_id: null });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Category could not be deleted.";
    return Response.json({ error: message }, { status: /already removed/.test(message) ? 404 : 503 });
  }
}
