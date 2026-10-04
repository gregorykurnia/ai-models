import assert from "node:assert/strict";
import { test } from "node:test";
import { groupSavedTaskIds, normalizeCategoryName, validateCategoryName } from "../src/lib/suitability-categories";

test("category names trim and collapse whitespace and reserve Uncategorized", () => {
  assert.deepEqual(validateCategoryName("  Product   research  "), { name: "Product research", normalizedName: "product research" });
  assert.equal(normalizeCategoryName("CAFÉ"), "café");
  assert.throws(() => validateCategoryName("  "), /Enter a category/);
  assert.throws(() => validateCategoryName("Uncategorized"), /reserved/);
  assert.throws(() => validateCategoryName("x".repeat(61)), /60 characters/);
});

test("saved tasks filter by any selected category and search, then sort groups and tasks", () => {
  const categories = [{ id: "research", name: "Research" }, { id: "coding", name: "Coding" }];
  const item = (id: string, category_id: string | null, updated_at: string, title = id) => ({
    task: { id, title, request: "Useful task", updated_at, category_id }, summary: id,
  });
  const tasks = [
    item("old", "coding", "2026-01-01T00:00:00Z", "Code review"),
    item("recent", "coding", "2026-02-01T00:00:00Z", "Code generation"),
    item("research", "research", "2026-03-01T00:00:00Z", "Research plan"),
    item("other", null, "2026-04-01T00:00:00Z", "General task"),
  ];
  const grouped = groupSavedTaskIds(tasks, ["research", "coding"], categories, "code");
  assert.equal(grouped.filteredCount, 2);
  assert.deepEqual(grouped.groups.map(group => group.name), ["Coding"]);
  assert.deepEqual(grouped.groups[0].tasks.map(task => task.task.id), ["recent", "old"]);

  const all = groupSavedTaskIds(tasks, [], categories);
  assert.deepEqual(all.groups.map(group => group.name), ["Coding", "Research", "Uncategorized"]);
  assert.deepEqual(groupSavedTaskIds(tasks, ["__uncategorized__"], categories).groups[0].tasks.map(task => task.task.id), ["other"]);
});

test("missing category IDs resolve to Uncategorized after the registry loads", () => {
  const task = { task: { id: "orphan", title: "Old task", request: "", updated_at: "2026-01-01T00:00:00Z", category_id: "deleted-category" } };
  const grouped = groupSavedTaskIds([task], ["__uncategorized__"], []);
  assert.equal(grouped.groups[0].name, "Uncategorized");
  assert.equal(grouped.groups[0].tasks.length, 1);
});

test("saved task order is applied before search and new tasks append after a saved sequence", () => {
  const categories = [{ id: "coding", name: "Coding" }];
  const item = (id: string, updated_at: string, title = id) => ({
    task: { id, title, request: "Useful task", updated_at, category_id: "coding" }, summary: id,
  });
  const tasks = [
    item("first", "2026-01-01T00:00:00Z", "Code first"),
    item("second", "2026-03-01T00:00:00Z", "Code second"),
    item("new", "2026-04-01T00:00:00Z", "Code new"),
  ];
  const order = { coding: ["second", "first"] };
  const grouped = groupSavedTaskIds(tasks, [], categories, "code", order);
  assert.deepEqual(grouped.groups[0].tasks.map(task => task.task.id), ["second", "first", "new"]);
  assert.deepEqual(groupSavedTaskIds(tasks, [], categories, "new", order).groups[0].tasks.map(task => task.task.id), ["new"]);
});
