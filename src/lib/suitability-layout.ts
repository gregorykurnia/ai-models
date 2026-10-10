import { z } from "zod";
import { isLiveSharedTask } from "./suitability-task-deletion";

export const UNCATEGORIZED_LAYOUT_ID = "__uncategorized__";
export const SAVED_TASK_LAYOUT_STORAGE_KEY = "model-benchmarks:suitability:layout:v1";

const taskIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const categoryIdSchema = taskIdSchema;

export const savedTaskLayoutEntrySchema = z.object({
  task_ids: z.array(taskIdSchema).max(5000),
  collapsed: z.boolean(),
});

export const savedTaskLayoutSchema = z.object({
  revision: z.number().int().nonnegative(),
  categories: z.record(categoryIdSchema, savedTaskLayoutEntrySchema),
});

export type SavedTaskLayoutEntry = z.infer<typeof savedTaskLayoutEntrySchema>;
export type SavedTaskLayout = z.infer<typeof savedTaskLayoutSchema>;

export const savedTaskLayoutOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move"),
    category_id: categoryIdSchema,
    task_ids: z.array(taskIdSchema).max(5000),
    expected_revision: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("collapse"),
    category_id: categoryIdSchema,
    collapsed: z.boolean(),
    expected_revision: z.number().int().nonnegative(),
  }),
]);

export type SavedTaskLayoutOperation = z.infer<typeof savedTaskLayoutOperationSchema>;

export function emptySavedTaskLayout(): SavedTaskLayout {
  return { revision: 0, categories: {} };
}

export type TaskInfo = { id: string; updatedAt: string; categoryId: string };
export type CategoryMembership = Map<string, TaskInfo[]>;

function taskOrder(a: TaskInfo, b: TaskInfo) {
  return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
}

/**
 * Groups live shared tasks under their active category, most recently updated first.
 * Tombstoned, unversioned, and unknown-category tasks are handled here, so the layout route and tests share one rule.
 */
export function collectSavedTaskMembership(
  tasks: ReadonlyArray<{ id: string; data: Record<string, unknown> | undefined }>,
  activeCategoryIds: readonly string[],
): CategoryMembership {
  const activeCategories = new Set(activeCategoryIds);
  const membership: CategoryMembership = new Map(
    [...activeCategories, UNCATEGORIZED_LAYOUT_ID].map(id => [id, []]),
  );
  for (const { id, data } of tasks) {
    if (!data || !isLiveSharedTask(data)) continue;
    const task = data.task as { updated_at?: unknown } | undefined;
    if (typeof task?.updated_at !== "string") continue;
    const requestedCategory = typeof data.category_id === "string" ? data.category_id : null;
    const categoryId = requestedCategory && activeCategories.has(requestedCategory)
      ? requestedCategory : UNCATEGORIZED_LAYOUT_ID;
    membership.get(categoryId)!.push({ id, updatedAt: task.updated_at, categoryId });
  }
  for (const members of membership.values()) members.sort(taskOrder);
  return membership;
}
