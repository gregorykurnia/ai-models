import assert from "node:assert/strict";
import { test } from "node:test";
import { recordSuitabilityEvent, readSuitabilityEventCounts, SUITABILITY_EVENTS_KEY } from "../src/lib/suitability-analytics";

test("event totals contain only allowlisted counters, and storage failure does not interrupt use", () => {
  const storage = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } });
    recordSuitabilityEvent("planner_opened"); recordSuitabilityEvent("planner_opened"); recordSuitabilityEvent("task_saved");
    assert.deepEqual(readSuitabilityEventCounts(storage.get(SUITABILITY_EVENTS_KEY)!), { planner_opened: 2, task_saved: 1 });
    assert.deepEqual(Object.keys(JSON.parse(storage.get(SUITABILITY_EVENTS_KEY)!)), ["version", "counts"]);
    assert.deepEqual(readSuitabilityEventCounts("bad JSON"), {});
    assert.deepEqual(readSuitabilityEventCounts('{"version":1,"counts":{"task_text":1}}'), {});
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("Storage unavailable"); } });
    assert.doesNotThrow(() => recordSuitabilityEvent("task_saved"));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
