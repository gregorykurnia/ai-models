export function parseModelSearchTerms(query: string): string[] {
  return [...new Set(query.split(",").map(term => term.trim().toLowerCase()).filter(Boolean))];
}

export function matchesModelSearch(text: string, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  const searchableText = text.toLowerCase();
  return terms.some(term => searchableText.includes(term));
}
