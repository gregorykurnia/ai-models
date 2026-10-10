/**
 * Deletion rules for saved tasks. A deleted shared task keeps its document as a tombstone:
 * `active_version` is removed, so the library, layout, and GET by ID skip it, and `deleted_at` is set,
 * so a stale editor or another browser's copy cannot recreate it. Kept in pure functions so the
 * server routes and the browser sync share one definition and the tests can exercise it directly.
 */

export const SHARED_TASK_DELETED_CODE = "task_deleted";
export const SHARED_TASK_DELETED_MESSAGE = "This task was deleted from the shared library.";
export const SHARED_TASK_CHANGED_MESSAGE = "This task changed in another tab. Reload the library before deleting.";

/** The shared task was deleted, so this write must not recreate it. */
export class SharedTaskDeletedError extends Error {
  constructor() {
    super(SHARED_TASK_DELETED_MESSAGE);
    this.name = "SharedTaskDeletedError";
  }
}

type SharedTaskData = Record<string, unknown> | undefined;

export function isDeletedSharedTask(data: SharedTaskData): boolean {
  return data?.deleted_at !== undefined && data?.deleted_at !== null;
}

/** Library, layout, and GET by ID show only tasks that have an active version and were not deleted. */
export function isLiveSharedTask(data: SharedTaskData): boolean {
  return typeof data?.active_version === "string" && !isDeletedSharedTask(data);
}

/** Throws before a save can write over a tombstone, which would otherwise bring the task back. */
export function assertSharedTaskAcceptsWrites(data: SharedTaskData): void {
  if (isDeletedSharedTask(data)) throw new SharedTaskDeletedError();
}

export type SharedTaskDeletePlan = "delete" | "already-deleted" | "changed" | "not-found";

/**
 * Decides what a delete request should do. A task that is already a tombstone counts as deleted,
 * so a repeated request from another tab succeeds. `expectedUpdatedAt` is the version the card showed.
 */
export function planSharedTaskDelete(data: SharedTaskData, expectedUpdatedAt: string): SharedTaskDeletePlan {
  if (!data) return "not-found";
  if (isDeletedSharedTask(data)) return "already-deleted";
  if (typeof data.active_version !== "string") return "not-found";
  const task = data.task as { updated_at?: unknown } | undefined;
  return task?.updated_at === expectedUpdatedAt ? "delete" : "changed";
}

/** A browser copy whose shared task was deleted stays on this device. It may hold edits, so it is never discarded automatically. */
export function markDeletedCopy<T extends object>(comparison: T, deletedAt: string): T & { shared_deleted_at: string } {
  return { ...comparison, shared_deleted_at: deletedAt };
}

/** Backups never carry the local marker: a file must not claim a task is deleted in some other browser. */
export function withoutDeletedMarker<T extends object>(comparison: T): Omit<T, "shared_deleted_at"> {
  const { shared_deleted_at: _deletedAt, ...portable } = comparison as T & { shared_deleted_at?: string };
  return portable;
}

/**
 * Syncs each browser copy on its own. A copy whose shared task was deleted goes to `onDeleted`,
 * and the loop continues. Any other error still stops the run and is rethrown.
 */
export async function syncEachBrowserCopy<T>(
  copies: readonly T[],
  upload: (copy: T) => Promise<void>,
  onDeleted: (copy: T) => Promise<void>,
): Promise<{ synced: number; deleted: number }> {
  let synced = 0;
  let deleted = 0;
  for (const copy of copies) {
    try {
      await upload(copy);
      synced++;
    } catch (cause) {
      if (!(cause instanceof SharedTaskDeletedError)) throw cause;
      await onDeleted(copy);
      deleted++;
    }
  }
  return { synced, deleted };
}
