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
) {
  const names = new Map(categories.map(category => [category.id, category.name]));
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  const categoryFilter = new Set(selectedCategoryIds);
  const filtered = tasks.filter(item => {
    const taskCategory = item.task.category_id && names.has(item.task.category_id) ? item.task.category_id : null;
    const matchesCategory = !categoryFilter.size || categoryFilter.has(taskCategory ?? "__uncategorized__");
    const haystack = "title" in item.task && "request" in item.task
      ? `${String(item.task.title)} ${String(item.task.request)}`.toLocaleLowerCase("en") : "";
    return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
  });
  const grouped = new Map<string, T[]>();
  for (const item of filtered) {
    const id = item.task.category_id && names.has(item.task.category_id) ? item.task.category_id : "__uncategorized__";
    grouped.set(id, [...(grouped.get(id) ?? []), item]);
  }
  for (const group of grouped.values()) group.sort((a, b) => b.task.updated_at.localeCompare(a.task.updated_at) || a.task.id.localeCompare(b.task.id));
  const ids = [...grouped.keys()].sort((a, b) => a === "__uncategorized__" ? 1 : b === "__uncategorized__" ? -1 : (names.get(a) ?? "").localeCompare(names.get(b) ?? "", "en") || a.localeCompare(b));
  return { filteredCount: filtered.length, groups: ids.map(id => ({ id: id === "__uncategorized__" ? null : id, name: id === "__uncategorized__" ? "Uncategorized" : names.get(id) ?? "Category unavailable", tasks: grouped.get(id) ?? [] })) };
}
