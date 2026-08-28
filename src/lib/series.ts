import { normalizeTag } from "./tags.js";
import type { Article } from "../types.js";

/**
 * Series ids use the same slug shape as tags, so both stay hand-typeable in
 * data/entries.json and two entries written on different days still land in
 * the same series.
 */
export function normalizeSeries(raw: string): string {
  return normalizeTag(raw);
}

/** "storing-messages" → "Storing messages". Derived, never stored. */
export function seriesLabel(id: string): string {
  const words = id.replace(/-/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface Series {
  id: string;
  label: string;
  /** Every entry in the series, oldest first — the order it is meant to be read in. */
  parts: Article[];
}

/**
 * Series id → its entries in reading order. Built from the *full* dataset, not
 * the filtered view, so "Part 2 of 4" keeps meaning what it says while a filter
 * is on. A slug used by only one entry is dropped: a series of one is noise on
 * the card, and it is usually a typo in the other entry's slug.
 */
export function buildSeriesIndex(articles: Article[]): Map<string, Series> {
  const parts = new Map<string, Article[]>();
  for (const article of articles) {
    if (!article.series) continue;
    const existing = parts.get(article.series);
    if (existing) existing.push(article);
    else parts.set(article.series, [article]);
  }

  const index = new Map<string, Series>();
  for (const [id, group] of parts) {
    if (group.length < 2) continue;
    index.set(id, {
      id,
      label: seriesLabel(id),
      parts: group.toSorted((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt)),
    });
  }
  return index;
}

/** Every series in use, largest first — what the entry form suggests. */
export function knownSeries(articles: Article[]): string[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    if (article.series) counts.set(article.series, (counts.get(article.series) ?? 0) + 1);
  }
  return [...counts].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
}
