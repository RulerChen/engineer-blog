/**
 * Entry search. Plain substring matching was too brittle to type into: a
 * full-width character pasted from a Chinese IME, a curly quote, a hyphen the
 * title spells differently, or one wrong letter and the entry was unreachable.
 *
 * Two passes over one piece of text. The whole query is first tried as a
 * substring of the folded text — that is the old behaviour, and it stays the
 * best score, so "c++" still finds the C++ posts even though the term pass would
 * strip the plus signs. Failing that, each term has to match a word, exactly or
 * within a small edit distance.
 *
 * An entry is then scored across four fields with those two passes: title,
 * summary, company-and-tags, and everything joined. Only some entries have a
 * summary, so the layering is what keeps that from mattering to the ranking —
 * see the weights below.
 */

import type { Article } from "../types.js";

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

/**
 * How far a term may be off before it stops being a typo and starts being a
 * different word. Short terms get nothing: at three letters "api" is one edit
 * from half the vocabulary.
 */
function maxDistance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/**
 * Optimal string alignment distance, capped: adjacent transpositions count as
 * one edit, which is what most typing mistakes are. Returns -1 past the cap.
 */
function distanceWithin(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return -1;
  if (a === b) return 0;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let row: number[] = [];
  for (let i = 1; i <= a.length; i++) {
    row = Array.from({ length: b.length + 1 }, () => 0);
    row[0] = i;
    let best = row[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prev2[j - 2] + 1);
      }
      row[j] = d;
      if (d < best) best = d;
    }
    if (best > max) return -1;
    prev2 = prev;
    prev = row;
  }
  const d = prev[b.length];
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
      const head = distanceWithin(word.slice(0, term.length + max), term, max);
      if (head >= 0) best = Math.max(best, 0.5 - 0.1 * head);
    }
  }
  return best;
}

/**
 * Match one folded text against a parsed query. Returns null when it does not
 * match at all, otherwise a score to rank the results by — every term has to
 * land, and the weakest one sets the tone. The ceiling is 2, for the whole query
 * found verbatim; a term-by-term match lands somewhere under 1.3.
 */
function scoreIndexed(entry: Indexed, query: Query, fuzzy = true): number | null {
  if (entry.folded.includes(query.folded)) return 2;
  // Too short to be worth taking apart: "c++" would fall back to the term "c"
  // and match a third of the shelf. At this length substring matching is enough.
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
export function matchScore(text: string, query: Query): number | null {
  return scoreIndexed(indexOf(text), query);
}

/** Same matching for the filter menus, where only yes-or-no is needed. */
export function matches(text: string, query: Query | null): boolean {
  return query === null || matchScore(text, query) !== null;
}

/**
 * How much of a field's score survives. The order is the point: the same words
 * found in a title always outrank them found in a summary, which outranks them
 * found in the company name or a tag. Without that, the handful of entries that
 * have been summarized so far would sit at the top of every result on nothing
 * more than having more text to match against.
 */
const SUMMARY_WEIGHT = 0.55;
const META_WEIGHT = 0.45;
/**
 * Everything joined, scored only when no single field matched — it is the one
 * thing that answers "netflix caching", where one term is the company and the
 * other is in the title. Weighted below every real field, so a cross-field
 * match is always the tail of the results rather than the head.
 */
const CROSS_FIELD_WEIGHT = 0.3;

interface Fields {
  title: Indexed;
  /** Absent until someone writes one — most entries have no summary yet. */
  summary: Indexed | null;
  /** Company and tags, which is all an un-summarized entry has beyond its title. */
  meta: Indexed;
  combined: Indexed;
}

/**
 * Folded once per entry rather than once per keystroke. Keyed by the object,
 * which lives as long as the loaded dataset does, so nothing has to be evicted.
 */
const fields = new WeakMap<Article, Fields>();

function fieldsOf(article: Article): Fields {
  let entry = fields.get(article);
  if (!entry) {
    const meta = [article.source, ...article.tags].filter(Boolean).join(" · ");
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

/**
 * Score a whole entry: the best field wins, never the sum of them. An entry that
 * says "kafka" in its title, its summary and its tags has said one thing three
 * times, and adding those up would rank verbosity.
 *
 * Typo tolerance applies to the title and the summary only. It is there for
 * prose someone half-remembers; company names and tags are short, are picked
 * from a menu anyway, and across a haystack this wide it stops forgiving typos
 * and starts inventing matches — every Netflix post has some word within two
 * edits of "caching".
 */
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
