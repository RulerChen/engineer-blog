/**
 * Starting palette offered by the entry form when you haven't typed anything
 * yet. Tags are free-form — this is a suggestion list, not a closed taxonomy, so
 * whatever you actually curate drifts to the front over time.
 */
export const SUGGESTED_TAGS = [
  "frontend",
  "backend",
  "mobile",
  "ai",
  "ml",
  "data",
  "infra",
  "databases",
  "observability",
  "architecture",
  "distributed-systems",
  "security",
  "devops",
  "networking",
  "performance",
  "testing",
  "cloud",
  "compilers",
  "os",
  "open-source",
  "culture",
  "career",
] as const;

/** Free-form tags are normalized to lowercase, trimmed, spaces to dashes. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Tags to offer for the current input. `known` comes first (tags already used in
 * the data, most-used first) so real usage outranks the static palette. With no
 * query this is just the head of that list; while typing, matches are ranked
 * prefix-first, then by length, so the closest tag lands nearest the cursor.
 */
export function suggestTags(
  query: string,
  known: string[],
  selected: string[],
  limit = 10,
): string[] {
  const taken = new Set(selected);
  const pool: string[] = [];
  for (const tag of [...known, ...SUGGESTED_TAGS]) {
    if (!taken.has(tag) && !pool.includes(tag)) pool.push(tag);
  }

  const q = normalizeTag(query);
  if (!q) return pool.slice(0, limit);

  return pool
    .filter((tag) => tag.includes(q))
    .toSorted((a, b) => {
      const aPrefix = a.startsWith(q) ? 0 : 1;
      const bPrefix = b.startsWith(q) ? 0 : 1;
      return aPrefix - bPrefix || a.length - b.length || a.localeCompare(b);
    })
    .slice(0, limit);
}
