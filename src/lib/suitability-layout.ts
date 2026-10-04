import { z } from "zod";

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
