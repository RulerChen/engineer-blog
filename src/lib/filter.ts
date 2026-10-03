import { parseQuery, scoreArticle } from "./search.js";
import { filterGroup } from "./tags.js";
import type { Article } from "../types.js";

export type DatePreset = "all" | "week" | "month" | "year" | "custom";

/** Any widens inside a group of the topic menu and narrows across groups, so mysql + sharding is both; all narrows on every pick. */
export type TagMode = "any" | "all";

export interface FilterState {
  query: string;
  companies: string[];
  /** Domains, concepts and technologies alike; an entry matches one only when its card shows it. */
  tags: string[];
  tagMode: TagMode;
  /** Series slug to narrow to, or null for every entry. Set by clicking a card's series row. */
  series: string | null;
  datePreset: DatePreset;
  dateFrom: string | null; // YYYY-MM-DD, custom preset only
  dateTo: string | null; // YYYY-MM-DD, custom preset only
}

export function emptyFilter(): FilterState {
  return {
    query: "",
    companies: [],
    tags: [],
    tagMode: "any",
    series: null,
    datePreset: "all",
    dateFrom: null,
    dateTo: null,
  };
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

/**
 * Filter, and — once there is a query — rank by how well the entry matched. The
 * sort is stable, so entries that matched equally well stay newest-first.
 */
export function applyFilters(articles: Article[], state: FilterState, now = new Date()): Article[] {
  const { from, to } = dateRange(state, now);
  const companies = new Set(state.companies);
  const groups = [...groupBy(state.tags, filterGroup).values()];
  const query = parseQuery(state.query);
  const scores = query ? new Map<string, number>() : null;
  const kept = articles.filter((article) => {
    if (companies.size > 0 && !companies.has(article.source)) return false;
    if (groups.length > 0) {
      const carries = (tag: string): boolean =>
        article.domain === tag || article.tags.includes(tag);
      const fits = (group: string[]): boolean =>
        state.tagMode === "all" ? group.every(carries) : group.some(carries);
      if (!groups.every(fits)) return false;
    }
    if (state.series && article.series !== state.series) return false;
    const published = Date.parse(article.publishedAt);
    if (published < from || published >= to) return false;
    if (query) {
      const score = scoreArticle(article, query);
      if (score === null) return false;
      scores!.set(article.id, score);
    }
    return true;
  });
  if (!scores) return kept;
  return kept.toSorted((a, b) => scores.get(b.id)! - scores.get(a.id)!);
}

function countBy(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

function groupBy(items: string[], key: (item: string) => string): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

export function companyCounts(articles: Article[]): { id: string; count: number }[] {
  return [...countBy(articles.map((a) => a.source).filter(Boolean))]
    .map(([id, count]) => ({ id, count }))
    .toSorted((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/**
 * Every tag in use, most-used first. Deliberately not truncated: the menu has a
 * search box and scrolls, and a top-N cut silently made a quarter of the entries
 * unreachable by any tag the panel would show.
 */
export function tagCounts(articles: Article[]): { tag: string; count: number }[] {
  return [...countBy(articles.flatMap((a) => [a.domain, ...a.tags]))]
    .map(([tag, count]) => ({ tag, count }))
    .toSorted((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
