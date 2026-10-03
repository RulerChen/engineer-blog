// Typo-tolerant entry search: the whole query as a substring first, then each term against words within a small edit distance.

import type { Article } from "../shared/entry.js";

/** Case, width and accents only: punctuation survives so "c++" stays "c++". */
function fold(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** …and now punctuation becomes a separator, so "zgateway:" and "zgateway" agree. */
function simplify(folded: string): string {
  return folded.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

interface Indexed {
  folded: string;
  simple: string;
  words: string[];
}

/** Text is stable for the life of the page, so fold each string once. */
const index = new Map<string, Indexed>();

function indexOf(text: string): Indexed {
  let entry = index.get(text);
  if (!entry) {
    const folded = fold(text);
    const simple = simplify(folded);
    entry = { folded, simple, words: simple ? simple.split(" ") : [] };
    index.set(text, entry);
  }
  return entry;
}

export interface Query {
  folded: string;
  terms: string[];
}

export function parseQuery(raw: string): Query | null {
  const folded = fold(raw);
  if (!folded) return null;
  const simple = simplify(folded);
  return { folded, terms: simple ? simple.split(" ") : [] };
}

/** Edits a term may be off by; at three letters "api" is one edit from half the vocabulary, so short terms get none. */
function maxDistance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/** DP rows reused across calls, since a keystroke runs this tens of thousands of times. */
let rows = [new Int32Array(32), new Int32Array(32), new Int32Array(32)];

/** Capped optimal string alignment distance over the first `aLength` chars of `a`, or -1 past the cap. */
function distanceWithin(a: string, b: string, max: number, aLength = a.length): number {
  if (Math.abs(aLength - b.length) > max) return -1;
  const n = b.length;
  if (rows[0].length <= n) rows = rows.map(() => new Int32Array(n + 1));
  let [prev2, prev, row] = rows;
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= aLength; i++) {
    const ai = a.charCodeAt(i - 1);
    row[0] = i;
    let best = i;
    for (let j = 1; j <= n; j++) {
      const bj = b.charCodeAt(j - 1);
      let d = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + (ai === bj ? 0 : 1));
      if (i > 1 && j > 1 && ai === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === bj) {
        d = Math.min(d, prev2[j - 2] + 1);
      }
      row[j] = d;
      if (d < best) best = d;
    }
    if (best > max) return -1;
    [prev2, prev, row] = [prev, row, prev2];
  }
  const d = prev[n];
  return d <= max ? d : -1;
}

/** 0 means the term is absent; higher is a better match. */
function termScore(entry: Indexed, term: string, fuzzy: boolean): number {
  const at = entry.simple.indexOf(term);
  if (at === 0) return 1;
  if (at > 0) {
    const boundary = entry.simple[at - 1] === " ";
    // A single letter matches far too much mid-word to be worth ranking.
    if (boundary) return 0.9;
    return term.length > 1 ? 0.7 : 0;
  }
  if (!fuzzy) return 0;
  const max = maxDistance(term.length);
  if (max === 0) return 0;
  let best = 0;
  for (const word of entry.words) {
    const whole = distanceWithin(word, term, max);
    if (whole >= 0) best = Math.max(best, 0.6 - 0.1 * whole);
    // A mistyped prefix: judge the term against just the head of the word.
    if (word.length > term.length) {
      const head = distanceWithin(word, term, max, Math.min(word.length, term.length + max));
      if (head >= 0) best = Math.max(best, 0.5 - 0.1 * head);
    }
  }
  return best;
}

/** Null when some term misses; otherwise up to 2 for the verbatim query, under 1.3 term by term, weighted to the weakest term. */
function scoreIndexed(entry: Indexed, query: Query, fuzzy = true): number | null {
  if (entry.folded.includes(query.folded)) return 2;
  // Taken apart, "c++" would become the term "c" and match a third of the list.
  if (query.folded.length <= 3 || query.terms.length === 0) return null;
  let total = 0;
  let worst = 1;
  for (const term of query.terms) {
    const score = termScore(entry, term, fuzzy);
    if (score === 0) return null;
    total += score;
    worst = Math.min(worst, score);
  }
  return total / query.terms.length + worst / 4;
}

/** Match a single piece of text — a company or tag name in the filter menus. */
function matchScore(text: string, query: Query): number | null {
  return scoreIndexed(indexOf(text), query);
}

/** Same matching for the filter menus, where only yes-or-no is needed. */
export function matches(text: string, query: Query | null): boolean {
  return query === null || matchScore(text, query) !== null;
}

/** Title beats summary beats company and tags, so the few summarized entries do not float up on text volume alone. */
const SUMMARY_WEIGHT = 0.55;
const META_WEIGHT = 0.45;
/** All fields joined, scored only when none matched alone, which is what answers "netflix caching". */
const CROSS_FIELD_WEIGHT = 0.3;

interface Fields {
  title: Indexed;
  /** Absent until someone writes one — most entries have no summary yet. */
  summary: Indexed | null;
  /** Company, domain and tags, which is all an un-summarized entry has beyond its title. */
  meta: Indexed;
  combined: Indexed;
}

/** Folded once per entry; keyed by the object, which lives as long as the loaded dataset. */
const fields = new WeakMap<Article, Fields>();

function fieldsOf(article: Article): Fields {
  let entry = fields.get(article);
  if (!entry) {
    const meta = [article.source, article.domain, ...article.tags].filter(Boolean).join(" · ");
    entry = {
      title: indexOf(article.title),
      summary: article.summary ? indexOf(article.summary) : null,
      meta: indexOf(meta),
      combined: indexOf([article.title, article.summary ?? "", meta].join(" · ")),
    };
    fields.set(article, entry);
  }
  return entry;
}

/** The best field wins, never the sum; typos are forgiven in prose only, since short tags would match anything. */
export function scoreArticle(article: Article, query: Query): number | null {
  const entry = fieldsOf(article);
  let best: number | null = null;
  const title = scoreIndexed(entry.title, query);
  if (title !== null) best = title;
  if (entry.summary) {
    const summary = scoreIndexed(entry.summary, query);
    if (summary !== null) best = Math.max(best ?? 0, summary * SUMMARY_WEIGHT);
  }
  const meta = scoreIndexed(entry.meta, query, false);
  if (meta !== null) best = Math.max(best ?? 0, meta * META_WEIGHT);
  if (best !== null) return best;
  const combined = scoreIndexed(entry.combined, query, false);
  return combined === null ? null : combined * CROSS_FIELD_WEIGHT;
}
