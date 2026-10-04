import { UNCATEGORIZED_LAYOUT_ID } from "./suitability-layout";

export function normalizeCategoryName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function validateCategoryName(value: unknown): { name: string; normalizedName: string } {
  if (typeof value !== "string") throw new Error("Enter a category name.");
  const name = value.normalize("NFC").trim().replace(/\s+/g, " ");
  const normalizedName = normalizeCategoryName(name);
  if (!name) throw new Error("Enter a category name.");
  if ([...name].length > 60) throw new Error("Category names must be 60 characters or fewer.");
  if (normalizedName === "uncategorized") throw new Error("Uncategorized is reserved for tasks without a category.");
  return { name, normalizedName };
}

export function groupSavedTaskIds<T extends { task: { id: string; updated_at: string; category_id?: string | null } }>(
  tasks: T[], selectedCategoryIds: string[], categories: { id: string; name: string }[], query = "",
  taskOrder: Readonly<Record<string, readonly string[]>> = {},
) {
  const names = new Map(categories.map(category => [category.id, category.name]));
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  const categoryFilter = new Set(selectedCategoryIds);
  const grouped = new Map<string, T[]>();
  for (const item of tasks) {
    const id = item.task.category_id && names.has(item.task.category_id) ? item.task.category_id : UNCATEGORIZED_LAYOUT_ID;
    grouped.set(id, [...(grouped.get(id) ?? []), item]);
  }
  const compareByUpdate = (a: T, b: T) => b.task.updated_at.localeCompare(a.task.updated_at) || a.task.id.localeCompare(b.task.id);
  for (const [id, group] of grouped) {
    const configured = taskOrder[id];
    if (!configured) {
      group.sort(compareByUpdate);
      continue;
    }
    const byId = new Map(group.map(item => [item.task.id, item]));
    const seen = new Set<string>();
    const ordered = configured.flatMap(taskId => {
      const item = byId.get(taskId);
      if (!item || seen.has(taskId)) return [];
      seen.add(taskId);
      return [item];
    });
    ordered.push(...group.filter(item => !seen.has(item.task.id)).sort(compareByUpdate));
    group.splice(0, group.length, ...ordered);
  }
  const ids = [...grouped.keys()].sort((a, b) => a === UNCATEGORIZED_LAYOUT_ID ? 1 : b === UNCATEGORIZED_LAYOUT_ID ? -1 : (names.get(a) ?? "").localeCompare(names.get(b) ?? "", "en") || a.localeCompare(b));
  const groups = ids.map(id => {
    const matches = (grouped.get(id) ?? []).filter(item => {
      const matchesCategory = !categoryFilter.size || categoryFilter.has(id);
      const haystack = "title" in item.task && "request" in item.task
        ? `${String(item.task.title)} ${String(item.task.request)}`.toLocaleLowerCase("en") : "";
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
    return { id: id === UNCATEGORIZED_LAYOUT_ID ? null : id, name: id === UNCATEGORIZED_LAYOUT_ID ? "Uncategorized" : names.get(id) ?? "Category unavailable", tasks: matches };
  }).filter(group => group.tasks.length > 0);
  return { filteredCount: groups.reduce((count, group) => count + group.tasks.length, 0), groups };
}
