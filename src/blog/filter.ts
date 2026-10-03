import type { Article } from "../shared/entry.js";
import { filterGroup } from "../shared/tags.js";
import { parseQuery, scoreArticle } from "./search.js";

/** Week, month and year are no longer offered by the picker but still read from old links. */
export const DATE_PRESETS = ["all", "week", "month", "year", "custom"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

/** Any widens inside a group of the topic menu and narrows across groups; all narrows on every pick. */
export type TagMode = "any" | "all";

export interface FilterState {
  query: string;
  companies: string[];
  /** Domains, concepts and technologies alike; an entry matches one only when its card shows it. */
  tags: string[];
  tagMode: TagMode;
  /** Set by clicking a card's series row. */
  series: string | null;
  datePreset: DatePreset;
  /** YYYY-MM-DD, custom preset only. */
  dateFrom: string | null;
  /** YYYY-MM-DD, inclusive, custom preset only. */
  dateTo: string | null;
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

export function resetFilter(state: FilterState): void {
  Object.assign(state, emptyFilter());
}

export function isFiltered(state: FilterState): boolean {
  return (
    state.companies.length > 0 ||
    state.tags.length > 0 ||
    state.series !== null ||
    state.datePreset !== "all" ||
    state.query.trim() !== ""
  );
}

/** The list with `id` added, or removed if it was there. */
export function toggled(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

const DAY_MS = 86_400_000;

/** Half-open [from, to) in epoch milliseconds. */
function dateRange(state: FilterState, now: Date): { from: number; to: number } {
  const daysBack = (days: number) => ({ from: now.getTime() - days * DAY_MS, to: Infinity });
  switch (state.datePreset) {
    case "all":
      return { from: -Infinity, to: Infinity };
    case "week":
      return daysBack(7);
    case "month":
      return daysBack(30);
    case "year":
      return daysBack(365);
    case "custom":
      return {
        from: state.dateFrom ? Date.parse(`${state.dateFrom}T00:00:00.000Z`) : -Infinity,
        to: state.dateTo ? Date.parse(`${state.dateTo}T00:00:00.000Z`) + DAY_MS : Infinity,
      };
  }
}

function groupBy(items: string[], key: (item: string) => string): string[][] {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return [...groups.values()];
}

/** Filtered, then ranked by match once there is a query; the sort is stable, so ties stay newest first. */
export function applyFilters(articles: Article[], state: FilterState, now = new Date()): Article[] {
  const { from, to } = dateRange(state, now);
  const companies = new Set(state.companies);
  const tagGroups = groupBy(state.tags, filterGroup);
  const query = parseQuery(state.query);
  const scores = new Map<string, number>();
  const kept = articles.filter((article) => {
    if (companies.size > 0 && !companies.has(article.source)) return false;
    const carries = (tag: string): boolean => article.domain === tag || article.tags.includes(tag);
    const fits = (group: string[]): boolean =>
      state.tagMode === "all" ? group.every(carries) : group.some(carries);
    if (!tagGroups.every(fits)) return false;
    if (state.series && article.series !== state.series) return false;
    const published = Date.parse(article.publishedAt);
    if (published < from || published >= to) return false;
    if (!query) return true;
    const score = scoreArticle(article, query);
    if (score === null) return false;
    scores.set(article.id, score);
    return true;
  });
  return query ? kept.toSorted((a, b) => scores.get(b.id)! - scores.get(a.id)!) : kept;
}

export interface Count {
  id: string;
  count: number;
}

/** Most used first, ties by id. */
function countAll(ids: string[]): Count[] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts]
    .map(([id, count]) => ({ id, count }))
    .toSorted((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

export function companyCounts(articles: Article[]): Count[] {
  return countAll(articles.map((a) => a.source).filter(Boolean));
}

/** Every tag in use, never truncated: a top-N cut once left a quarter of the entries unreachable by tag. */
export function tagCounts(articles: Article[]): Count[] {
  return countAll(articles.flatMap((a) => [a.domain, ...a.tags]));
}
