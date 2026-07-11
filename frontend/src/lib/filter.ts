import type { Article } from "../types.js";

export type DatePreset = "all" | "week" | "month" | "year" | "custom";

export interface FilterState {
  query: string;
  companies: string[];
  tags: string[];
  datePreset: DatePreset;
  dateFrom: string | null; // YYYY-MM-DD, custom preset only
  dateTo: string | null; // YYYY-MM-DD, custom preset only
}

export function emptyFilter(): FilterState {
  return { query: "", companies: [], tags: [], datePreset: "all", dateFrom: null, dateTo: null };
}

const DAY_MS = 86_400_000;

function dateRange(state: FilterState, now: Date): { from: number; to: number } {
  switch (state.datePreset) {
    case "all":
      return { from: -Infinity, to: Infinity };
    case "week":
      return { from: now.getTime() - 7 * DAY_MS, to: Infinity };
    case "month":
      return { from: now.getTime() - 30 * DAY_MS, to: Infinity };
    case "year":
      return { from: now.getTime() - 365 * DAY_MS, to: Infinity };
    case "custom":
      return {
        from: state.dateFrom ? Date.parse(`${state.dateFrom}T00:00:00.000Z`) : -Infinity,
        // inclusive end day: anything before the *next* day counts
        to: state.dateTo ? Date.parse(`${state.dateTo}T00:00:00.000Z`) + DAY_MS : Infinity,
      };
  }
}

export function applyFilters(articles: Article[], state: FilterState, now = new Date()): Article[] {
  const { from, to } = dateRange(state, now);
  const companies = new Set(state.companies);
  const tags = new Set(state.tags);
  const query = state.query.trim().toLowerCase();
  return articles.filter((article) => {
    if (companies.size > 0 && !companies.has(article.source)) return false;
    if (tags.size > 0 && !article.tags.some((tag) => tags.has(tag))) return false;
    const published = Date.parse(article.publishedAt);
    if (published < from || published >= to) return false;
    if (
      query &&
      !article.title.toLowerCase().includes(query) &&
      !article.summary.toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });
}

function countBy(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

export function companyCounts(articles: Article[]): { id: string; count: number }[] {
  return [...countBy(articles.map((a) => a.source))]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

export function topTags(articles: Article[], limit = 30): { tag: string; count: number }[] {
  return [...countBy(articles.flatMap((a) => a.tags))]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function isNew(article: Article, now = new Date()): boolean {
  return now.getTime() - Date.parse(article.fetchedAt) < DAY_MS;
}
