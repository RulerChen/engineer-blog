import type { Article } from "./types.js";

/**
 * Pure merge: dedup by id, fresh data wins field-by-field — except fetchedAt,
 * which always keeps its original first-seen value. Sorted newest-first.
 */
export function merge(existing: Article[], fetched: Article[]): Article[] {
  const byId = new Map(existing.map((article) => [article.id, article]));
  for (const incoming of fetched) {
    const prior = byId.get(incoming.id);
    byId.set(incoming.id, prior ? { ...incoming, fetchedAt: prior.fetchedAt } : incoming);
  }
  return [...byId.values()].toSorted(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
