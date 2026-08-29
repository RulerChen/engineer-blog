/** Free-form tags are normalized to lowercase, trimmed, spaces to dashes. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Tags to offer for the current input, drawn only from `known` — the tags already
 * used in the data. There is no static palette: suggesting tags nobody has
 * curated is how near-duplicates ("database" vs "databases") get into the data
 * and split a filter in two. Nothing is offered until something is typed: the
 * head of the list answers a question nobody asked, and it pushes the rest of
 * the form down every time the modal opens. While typing, matches are ranked
 * prefix-first, then by length, so the closest tag lands nearest the cursor.
 * Anything genuinely new is still typed in free-form — the form flags it as a
 * new tag.
 */
export function suggestTags(
  query: string,
  known: string[],
  selected: string[],
  limit = 10,
): string[] {
  const q = normalizeTag(query);
  if (!q) return [];

  const taken = new Set(selected);
  const pool: string[] = [];
  for (const tag of known) {
    if (!taken.has(tag) && !pool.includes(tag)) pool.push(tag);
  }

  return pool
    .filter((tag) => tag.includes(q))
    .toSorted((a, b) => {
      const aPrefix = a.startsWith(q) ? 0 : 1;
      const bPrefix = b.startsWith(q) ? 0 : 1;
      return aPrefix - bPrefix || a.length - b.length || a.localeCompare(b);
    })
    .slice(0, limit);
}
