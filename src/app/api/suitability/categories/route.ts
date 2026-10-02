import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";
import { validateCategoryName } from "@/lib/suitability-categories";
import { suitabilityCategorySchema } from "@/lib/suitability-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = () => adminDb().collection("sharedSuitabilityCategories");
const nameKeys = () => adminDb().collection("sharedSuitabilityCategoryNames");
const keyFor = (name: string) => createHash("sha256").update(name).digest("hex");

export async function GET() {
  try {
    const snapshot = await categories().where("deleted", "==", false).get();
    const result = snapshot.docs.map(doc => suitabilityCategorySchema.parse({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id));
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Categories could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    let body: { name?: unknown };
    try { body = await request.json(); }
    catch { return Response.json({ error: "Enter a category name." }, { status: 400 }); }
    const { name, normalizedName } = validateCategoryName(body.name);
    const db = adminDb();
    const id = randomUUID();
    const ref = categories().doc(id);
    const keyRef = nameKeys().doc(keyFor(normalizedName));
    const now = new Date().toISOString();
    await db.runTransaction(async transaction => {
      const key = await transaction.get(keyRef);
      if (key.exists) throw new Error("A category with this name already exists.");
      transaction.create(ref, { name, normalized_name: normalizedName, created_at: now, updated_at: now, deleted: false });
      transaction.create(keyRef, { category_id: id, created_at: FieldValue.serverTimestamp() });
    });
    return Response.json(suitabilityCategorySchema.parse({ id, name, normalized_name: normalizedName, created_at: now, updated_at: now }), { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Category could not be created.";
    const status = /already exists/.test(message) ? 409 : /reserved|60 characters|Enter a category/.test(message) ? 400 : 503;
    return Response.json({ error: message }, { status });
  }
}
