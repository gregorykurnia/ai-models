import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";
import {
  collectSavedTaskMembership,
  emptySavedTaskLayout,
  savedTaskLayoutOperationSchema,
  savedTaskLayoutSchema,
  type CategoryMembership,
  type SavedTaskLayout,
  type SavedTaskLayoutEntry,
  type TaskInfo,
  UNCATEGORIZED_LAYOUT_ID,
} from "@/lib/suitability-layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const layoutDocument = () => adminDb().collection("sharedSuitabilityLayouts").doc("saved-library");
const taskCollection = () => adminDb().collection("sharedSuitabilityTasks");
const categoryCollection = () => adminDb().collection("sharedSuitabilityCategories");

function readStoredLayout(snapshot: FirebaseFirestore.DocumentSnapshot): SavedTaskLayout {
  const parsed = savedTaskLayoutSchema.safeParse({
    revision: snapshot.get("revision") ?? 0,
    categories: snapshot.get("categories") ?? {},
  });
  return parsed.success ? parsed.data : emptySavedTaskLayout();
}

function collectMembership(
  taskSnapshots: FirebaseFirestore.QuerySnapshot,
  categorySnapshots: FirebaseFirestore.QuerySnapshot,
): CategoryMembership {
  return collectSavedTaskMembership(
    taskSnapshots.docs.map(snapshot => ({ id: snapshot.id, data: snapshot.data() })),
    categorySnapshots.docs.map(snapshot => snapshot.id),
  );
}

function reconcileEntry(entry: SavedTaskLayoutEntry | undefined, members: TaskInfo[]): SavedTaskLayoutEntry {
  const currentIds = new Set(members.map(task => task.id));
  const seen = new Set<string>();
  const ordered = (entry?.task_ids ?? []).filter(id => currentIds.has(id) && !seen.has(id));
  ordered.forEach(id => seen.add(id));
  ordered.push(...members.filter(task => !seen.has(task.id)).map(task => task.id));
  return { task_ids: ordered, collapsed: entry?.collapsed ?? false };
}

function reconcileLayout(stored: SavedTaskLayout, membership: CategoryMembership): SavedTaskLayout {
  const categories: Record<string, SavedTaskLayoutEntry> = {};
  for (const [categoryId, entry] of Object.entries(stored.categories)) {
    const members = membership.get(categoryId);
    if (members) categories[categoryId] = reconcileEntry(entry, members);
  }
  return { revision: stored.revision, categories };
}

async function readCurrentState() {
  const [layoutSnapshot, taskSnapshots, categorySnapshots] = await Promise.all([
    layoutDocument().get(),
    taskCollection().get(),
    categoryCollection().where("deleted", "==", false).get(),
  ]);
  const membership = collectMembership(taskSnapshots, categorySnapshots);
  return { layoutSnapshot, membership };
}

export async function GET() {
  try {
    const { layoutSnapshot, membership } = await readCurrentState();
    return Response.json(reconcileLayout(readStoredLayout(layoutSnapshot), membership), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (cause) {
    const quotaExceeded = (cause as { code?: number }).code === 8;
    return Response.json({ error: quotaExceeded
      ? "Firestore's read quota is exhausted. Saved task layout is temporarily unavailable."
      : "Saved task layout could not be loaded." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "The saved task layout change is invalid." }, { status: 400 }); }
  const parsed = savedTaskLayoutOperationSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "The saved task layout change is invalid." }, { status: 400 });
  const operation = parsed.data;

  try {
    const db = adminDb();
    const result = await db.runTransaction(async transaction => {
      const layoutSnapshot = await transaction.get(layoutDocument());
      const taskSnapshots = await transaction.get(taskCollection());
      const categorySnapshots = await transaction.get(categoryCollection().where("deleted", "==", false));
      const membership = collectMembership(taskSnapshots, categorySnapshots);
      const stored = reconcileLayout(readStoredLayout(layoutSnapshot), membership);
      if (stored.revision !== operation.expected_revision) {
        throw new Error("The saved task layout changed in another browser. Reload the library and try again.");
      }
      if (operation.category_id !== UNCATEGORIZED_LAYOUT_ID && !membership.has(operation.category_id)) {
        throw new Error("This category is no longer available. Reload categories and try again.");
      }
      const members = membership.get(operation.category_id)!;
      const currentEntry = reconcileEntry(stored.categories[operation.category_id], members);
      let nextEntry: SavedTaskLayoutEntry = currentEntry;
      if (operation.type === "collapse") {
        nextEntry = { ...currentEntry, collapsed: operation.collapsed };
      } else {
        const categoryByTaskId = new Map([...membership.entries()].flatMap(([categoryId, tasks]) => tasks.map(task => [task.id, categoryId] as const)));
        const crossCategory = operation.task_ids.find(taskId => {
          const currentCategory = categoryByTaskId.get(taskId);
          return currentCategory !== undefined && currentCategory !== operation.category_id;
        });
        if (crossCategory) throw new Error("A task cannot be ordered across categories.");
        const currentIds = new Set(members.map(task => task.id));
        const seen = new Set<string>();
        const requested = operation.task_ids.filter(taskId => currentIds.has(taskId) && !seen.has(taskId));
        requested.forEach(taskId => seen.add(taskId));
        requested.push(...currentEntry.task_ids.filter(taskId => !seen.has(taskId)));
        nextEntry = { task_ids: requested, collapsed: currentEntry.collapsed };
      }
      const nextLayout: SavedTaskLayout = {
        revision: stored.revision + 1,
        categories: { ...stored.categories, [operation.category_id]: nextEntry },
      };
      transaction.set(layoutDocument(), {
        revision: nextLayout.revision,
        categories: nextLayout.categories,
        updated_at: FieldValue.serverTimestamp(),
      });
      return nextLayout;
    });
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Saved task layout could not be updated.";
    const quotaExceeded = (cause as { code?: number }).code === 8;
    const status = /changed in another browser|no longer available/.test(message) ? 409
      : /cannot be ordered/.test(message) ? 400 : 503;
    return Response.json({ error: quotaExceeded
      ? "Firestore's write quota is exhausted. Saved task layout was not changed."
      : message }, { status });
  }
}
