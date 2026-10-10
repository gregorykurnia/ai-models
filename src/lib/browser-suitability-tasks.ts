import { readSavedTasks, savedComparisonSchema, TASK_STORAGE_KEY, type SavedComparison } from "./suitability-storage";

const databaseName = "model-benchmarks:suitability";
const storeName = "tasks";

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "task.id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage could not be opened."));
    request.onblocked = () => reject(new Error("Browser storage is blocked by another tab."));
  });
}

async function readIndexedTasks(): Promise<SavedComparison[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    transaction.oncomplete = () => {
      database.close();
      try { resolve(readSavedTasks(JSON.stringify(request.result))); }
      catch (cause) { reject(cause); }
    };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Browser-saved tasks could not be read.")); };
  });
}

export async function readBrowserTasks(): Promise<SavedComparison[]> {
  let indexed: SavedComparison[] = [];
  let indexedError: unknown;
  try { indexed = await readIndexedTasks(); } catch (cause) { indexedError = cause; }
  const tasks = new Map(indexed.map(comparison => [comparison.task.id, comparison]));
  let legacy: SavedComparison[] = [];
  try { legacy = readSavedTasks(localStorage.getItem(TASK_STORAGE_KEY)); } catch { /* Preserve malformed legacy records without blocking verified browser saves. */ }
  if (indexedError && !legacy.length) throw indexedError;
  for (const comparison of legacy) {
    const existing = tasks.get(comparison.task.id);
    if (!existing || comparison.task.updated_at > existing.task.updated_at) tasks.set(comparison.task.id, comparison);
  }
  return [...tasks.values()];
}

/** Resolve only after the write commits and the pinned comparison can be read back. */
export async function saveBrowserTask(comparison: SavedComparison): Promise<void> {
  const validated = savedComparisonSchema.parse(comparison);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(validated);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Browser storage is full or unavailable.")); };
  });
  const restored = (await readIndexedTasks()).find(item => item.task.id === validated.task.id);
  if (!restored || JSON.stringify(restored) !== JSON.stringify(validated)) throw new Error("The browser save could not be verified. Download a backup before leaving this page.");
}

/** Remove only the version uploaded, preserving a newer edit made in another tab. */
export async function removeBrowserTask(comparison: SavedComparison): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.get(comparison.task.id);
    request.onsuccess = () => {
      if (request.result?.task.updated_at === comparison.task.updated_at) store.delete(comparison.task.id);
    };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Browser copy could not be removed.")); };
  });
  const legacy = readSavedTasks(localStorage.getItem(TASK_STORAGE_KEY));
  const remaining = legacy.filter(item => item.task.id !== comparison.task.id || item.task.updated_at !== comparison.task.updated_at);
  if (remaining.length !== legacy.length) {
    if (remaining.length) localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(remaining));
    else localStorage.removeItem(TASK_STORAGE_KEY);
  }
}

/** Removes one task from the legacy localStorage JSON. Returns null when nothing remains. Throws on malformed data, so nothing is deleted half-way. */
export function withoutLegacyTask(raw: string | null, taskId: string): string | null {
  if (!raw) return null;
  const records = JSON.parse(raw) as Array<{ task?: { id?: unknown } } | null>;
  if (!Array.isArray(records)) throw new Error("Browser-saved tasks could not be read.");
  const remaining = records.filter(record => record?.task?.id !== taskId);
  return remaining.length ? JSON.stringify(remaining) : null;
}

/**
 * Deletes this browser's copy of a task, including a copy kept after its shared task was deleted.
 * Unlike removeBrowserTask there is no updated_at guard, because the user asked for this delete.
 * Makes no server call.
 */
export async function deleteBrowserTask(taskId: string): Promise<void> {
  const raw = localStorage.getItem(TASK_STORAGE_KEY);
  const remaining = withoutLegacyTask(raw, taskId);
  if (remaining !== raw) {
    if (remaining) localStorage.setItem(TASK_STORAGE_KEY, remaining);
    else localStorage.removeItem(TASK_STORAGE_KEY);
  }
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(taskId);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Browser copy could not be removed.")); };
  });
}
