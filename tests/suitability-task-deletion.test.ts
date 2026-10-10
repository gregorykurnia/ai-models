import assert from "node:assert/strict";
import { test } from "node:test";
import { collectSavedTaskMembership, UNCATEGORIZED_LAYOUT_ID } from "../src/lib/suitability-layout";
import {
  assertSharedTaskAcceptsWrites,
  isLiveSharedTask,
  markDeletedCopy,
  planSharedTaskDelete,
  SHARED_TASK_DELETED_MESSAGE,
  SharedServiceUnavailableError,
  SharedTaskDeletedError,
  syncEachBrowserCopy,
  withoutDeletedMarker,
} from "../src/lib/suitability-task-deletion";

const UPDATED = "2026-10-01T00:00:00Z";
const liveData = (id: string, updatedAt: string, extra: Record<string, unknown> = {}) => ({
  active_version: `version-${id}`, task: { id, updated_at: updatedAt }, ...extra,
});
const tombstoneData = (id: string, updatedAt: string, extra: Record<string, unknown> = {}) => ({
  task: { id, updated_at: updatedAt }, deleted_at: "2026-10-10T09:00:00Z", ...extra,
});

test("a tombstoned task is not live and refuses writes, while a new or live task still saves", () => {
  assert.equal(isLiveSharedTask(liveData("a", UPDATED)), true);
  assert.equal(isLiveSharedTask(tombstoneData("a", UPDATED)), false);
  assert.equal(isLiveSharedTask(undefined), false);

  assert.doesNotThrow(() => assertSharedTaskAcceptsWrites(undefined), "a brand-new task can be created");
  assert.doesNotThrow(() => assertSharedTaskAcceptsWrites(liveData("a", UPDATED)));
  assert.throws(() => assertSharedTaskAcceptsWrites(tombstoneData("a", UPDATED)), error => {
    assert.ok(error instanceof SharedTaskDeletedError);
    assert.equal(error.name, "SharedTaskDeletedError");
    assert.equal(error.message, SHARED_TASK_DELETED_MESSAGE);
    return true;
  });
});

test("a delete removes only when the card's version is still current; a tombstone counts as deleted", () => {
  assert.equal(planSharedTaskDelete(undefined, UPDATED), "not-found");
  assert.equal(planSharedTaskDelete(liveData("a", UPDATED), UPDATED), "delete");
  assert.equal(planSharedTaskDelete(liveData("a", "2026-10-02T00:00:00Z"), UPDATED), "changed",
    "an edit made in another tab blocks the delete");
  assert.equal(planSharedTaskDelete(tombstoneData("a", UPDATED), "2026-09-01T00:00:00Z"), "already-deleted",
    "a repeated delete from another tab succeeds without a new write");
  assert.equal(planSharedTaskDelete({ task: { id: "a", updated_at: UPDATED } }, UPDATED), "not-found",
    "a document with neither an active version nor a tombstone is treated as missing");
});

test("layout membership excludes deleted tasks and orders live tasks most recent first", () => {
  const membership = collectSavedTaskMembership([
    { id: "older", data: liveData("older", "2026-01-01T00:00:00Z", { category_id: "research" }) },
    { id: "newer", data: liveData("newer", "2026-02-01T00:00:00Z", { category_id: "research" }) },
    { id: "deleted", data: tombstoneData("deleted", "2026-03-01T00:00:00Z", { category_id: "research" }) },
    { id: "unknown-category", data: liveData("unknown-category", "2026-04-01T00:00:00Z", { category_id: "gone" }) },
    { id: "missing", data: undefined },
  ], ["research"]);

  assert.deepEqual(membership.get("research")!.map(task => task.id), ["newer", "older"]);
  assert.deepEqual(membership.get(UNCATEGORIZED_LAYOUT_ID)!.map(task => task.id), ["unknown-category"]);
  const everyId = [...membership.values()].flat().map(task => task.id);
  assert.equal(everyId.includes("deleted"), false, "a tombstone never appears in the layout");
});

test("a deleted browser copy is kept and skipped while later copies still sync", async () => {
  const uploaded: string[] = [];
  const kept: string[] = [];
  const result = await syncEachBrowserCopy(["first", "deleted", "third"], async id => {
    if (id === "deleted") throw new SharedTaskDeletedError();
    uploaded.push(id);
  }, async id => { kept.push(id); });

  assert.deepEqual(uploaded, ["first", "third"]);
  assert.deepEqual(kept, ["deleted"]);
  assert.deepEqual(result, { synced: 2, deleted: 1, failed: [] });
});

test("a failed copy is reported and later copies still sync", async () => {
  const uploaded: string[] = [];
  const result = await syncEachBrowserCopy(["first", "broken", "third"], async id => {
    if (id === "broken") throw new Error("The saved task data is invalid.");
    uploaded.push(id);
  }, async () => { assert.fail("only deleted copies are kept"); });

  assert.deepEqual(uploaded, ["first", "third"]);
  assert.deepEqual(result, { synced: 2, deleted: 0, failed: [{ copy: "broken", message: "The saved task data is invalid." }] });
});

test("a service-unavailable error stops the run, so later copies are not attempted", async () => {
  const attempted: string[] = [];
  await assert.rejects(syncEachBrowserCopy(["first", "outage", "third"], async id => {
    attempted.push(id);
    if (id === "outage") throw new SharedServiceUnavailableError("Firestore's quota is exhausted.");
  }, async () => { assert.fail("only deleted copies are kept"); }), SharedServiceUnavailableError);
  assert.deepEqual(attempted, ["first", "outage"]);
});

test("the kept-local marker stays on the browser copy and never reaches a backup", () => {
  const copy = { task: { id: "task-1", title: "Stock analysis" }, category_id: null };
  const marked = markDeletedCopy(copy, "2026-10-10T09:00:00Z");
  assert.equal(marked.shared_deleted_at, "2026-10-10T09:00:00Z");
  assert.equal("shared_deleted_at" in copy, false, "marking does not mutate the original");

  const exported = withoutDeletedMarker(marked);
  assert.equal("shared_deleted_at" in exported, false);
  assert.deepEqual(exported.task, copy.task);
});
