import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { deleteBrowserTask, withoutLegacyTask } from "../src/lib/browser-suitability-tasks";

const LEGACY_KEY = "model-benchmarks:suitability:v1";

type Row = { task: { id: string; updated_at: string } };

/** Minimal stand-ins for the two browser stores. The IndexedDB fake covers only what deleteBrowserTask uses. */
function installBrowserStorage(indexed: Row[], legacy: string | null) {
  const rows = new Map(indexed.map(row => [row.task.id, row]));
  const legacyValues = new Map<string, string>(legacy === null ? [] : [[LEGACY_KEY, legacy]]);
  const database = {
    transaction() {
      const transaction: Record<string, unknown> = { error: null, oncomplete: null, onabort: null };
      transaction.objectStore = () => ({ delete: (key: string) => { rows.delete(key); } });
      setTimeout(() => (transaction.oncomplete as (() => void) | null)?.(), 0);
      return transaction;
    },
    close() {},
  };
  Object.assign(globalThis, {
    indexedDB: {
      open() {
        const request: Record<string, unknown> = {};
        setTimeout(() => {
          request.result = database;
          (request.onsuccess as (() => void) | undefined)?.();
        }, 0);
        return request;
      },
    },
    localStorage: {
      getItem: (key: string) => legacyValues.get(key) ?? null,
      setItem: (key: string, value: string) => { legacyValues.set(key, value); },
      removeItem: (key: string) => { legacyValues.delete(key); },
    },
  });
  return { rows, legacyValues };
}

afterEach(() => {
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test("deleteBrowserTask removes the IndexedDB and legacy copies of one task and keeps the others", async () => {
  const gone = { task: { id: "gone", updated_at: "2026-10-01T00:00:00Z" } };
  const kept = { task: { id: "kept", updated_at: "2026-09-01T00:00:00Z" } };
  const legacy = JSON.stringify([gone, kept]);
  const { rows, legacyValues } = installBrowserStorage([gone, kept], legacy);

  await deleteBrowserTask("gone");

  assert.deepEqual([...rows.keys()], ["kept"]);
  assert.deepEqual(JSON.parse(legacyValues.get(LEGACY_KEY)!), [kept]);
});

test("deleteBrowserTask has no updated_at guard: a newer local copy is still removed", async () => {
  const newer = { task: { id: "edited", updated_at: "2026-10-09T12:00:00Z" } };
  const { rows, legacyValues } = installBrowserStorage([newer], null);

  await deleteBrowserTask("edited");

  assert.equal(rows.size, 0);
  assert.equal(legacyValues.has(LEGACY_KEY), false);
});

test("deleteBrowserTask removes the legacy key when the deleted task was its last record", async () => {
  const only = { task: { id: "only", updated_at: "2026-10-01T00:00:00Z" } };
  const { legacyValues } = installBrowserStorage([], JSON.stringify([only]));

  await deleteBrowserTask("only");

  assert.equal(legacyValues.has(LEGACY_KEY), false);
});

test("a malformed legacy record stops the delete before any copy is removed", async () => {
  const task = { task: { id: "safe", updated_at: "2026-10-01T00:00:00Z" } };
  const { rows } = installBrowserStorage([task], "{not json");

  await assert.rejects(deleteBrowserTask("safe"), SyntaxError);
  assert.equal(rows.has("safe"), true, "the IndexedDB copy is untouched when the legacy copy cannot be read");
});

test("withoutLegacyTask filters one task from the raw JSON and returns null when nothing remains", () => {
  assert.equal(withoutLegacyTask(null, "a"), null);
  assert.equal(withoutLegacyTask(JSON.stringify([{ task: { id: "a" } }]), "a"), null);
  const remaining = withoutLegacyTask(JSON.stringify([{ task: { id: "a" } }, { task: { id: "b" } }]), "a");
  assert.deepEqual(JSON.parse(remaining!), [{ task: { id: "b" } }]);
  assert.throws(() => withoutLegacyTask(JSON.stringify({ task: { id: "a" } }), "a"), /could not be read/);
});
