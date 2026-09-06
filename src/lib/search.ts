/**
 * Title search. Plain substring matching was too brittle to type into: a
 * full-width character pasted from a Chinese IME, a curly quote, a hyphen the
 * title spells differently, or one wrong letter and the entry was unreachable.
 *
 * Two passes. The whole query is first tried as a substring of the folded title
 * — that is the old behaviour, and it stays the best score, so "c++" still finds
 * the C++ posts even though the term pass would strip the plus signs. Failing
 * that, each term has to match a word, exactly or within a small edit distance.
 */

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

/** Titles are stable for the life of the page, so fold each one once. */
const index = new Map<string, Indexed>();

function indexOf(title: string): Indexed {
  let entry = index.get(title);
  if (!entry) {
    const folded = fold(title);
    const simple = simplify(folded);
    entry = { folded, simple, words: simple ? simple.split(" ") : [] };
    index.set(title, entry);
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
function termScore(entry: Indexed, term: string): number {
  const at = entry.simple.indexOf(term);
  if (at === 0) return 1;
  if (at > 0) {
    const boundary = entry.simple[at - 1] === " ";
    // A single letter matches far too much mid-word to be worth ranking.
    if (boundary) return 0.9;
    return term.length > 1 ? 0.7 : 0;
  }
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
 * Match a title against a parsed query. Returns null when it does not match at
 * all, otherwise a score to rank the results by — every term has to land, and
 * the weakest one sets the tone.
 */
export function matchScore(title: string, query: Query): number | null {
  const entry = indexOf(title);
  if (entry.folded.includes(query.folded)) return 2;
  // Too short to be worth taking apart: "c++" would fall back to the term "c"
  // and match a third of the shelf. At this length substring matching is enough.
  if (query.folded.length <= 3 || query.terms.length === 0) return null;
  let total = 0;
  let worst = 1;
  for (const term of query.terms) {
    const score = termScore(entry, term);
    if (score === 0) return null;
    total += score;
    worst = Math.min(worst, score);
  }
  return total / query.terms.length + worst / 4;
}

/** Same matching for the filter menus, where only yes-or-no is needed. */
export function matches(text: string, query: Query | null): boolean {
  return query === null || matchScore(text, query) !== null;
}
