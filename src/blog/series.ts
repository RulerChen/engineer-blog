import type { Article } from "../shared/entry.js";

/** "storing-messages" → "Storing messages". */
export function seriesLabel(id: string): string {
  const words = id.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface Series {
  id: string;
  label: string;
  /** Oldest first, the order it is meant to be read in. */
  parts: Article[];
}

/** Built from every entry, so "Part 2 of 4" holds under a filter; a one-entry slug is usually a typo and is dropped. */
export function buildSeriesIndex(articles: Article[]): Map<string, Series> {
  const parts = new Map<string, Article[]>();
  for (const article of articles) {
    if (!article.series) continue;
    const group = parts.get(article.series);
    if (group) group.push(article);
    else parts.set(article.series, [article]);
  }
  const index = new Map<string, Series>();
  for (const [id, group] of parts) {
    if (group.length < 2) continue;
    const ordered = group.toSorted((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
    index.set(id, { id, label: seriesLabel(id), parts: ordered });
  }
  return index;
}
