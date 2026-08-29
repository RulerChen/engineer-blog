import { normalizeSeries } from "./series.js";
import { tryNormalizeUrl } from "./url.js";
import type { Commentary } from "../types.js";

/**
 * Shape of one hand-written record in data/entries.json. This is the file's
 * contract: the entry form writes it, the build script reads it, and it stays
 * editable by hand. `id` is derived from `url` at build time, never stored.
 */
export interface EntryInput {
  title: string;
  url: string;
  source?: string;
  publishedAt: string; // YYYY-MM-DD or full ISO 8601
  /** Slug grouping this entry with its other parts. Same slug = same series. */
  series?: string;
  tags?: string[];
  /** Other people's write-ups about this entry — `{ source, url }` each. */
  commentary?: Commentary[];
}

/** Editable form state, before validation turns it into an EntryInput. */
export interface EntryDraft {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  series: string;
  tags: string[];
  /** Always carries one blank row at the end for typing into; blanks are dropped on save. */
  commentary: Commentary[];
}

export function emptyDraft(): EntryDraft {
  return {
    title: "",
    url: "",
    source: "",
    publishedAt: "",
    series: "",
    tags: [],
    commentary: [blankCommentary()],
  };
}

export function blankCommentary(): Commentary {
  return { source: "", url: "" };
}

/** Rows with a url, trimmed. A row left entirely blank is not an error, just nothing. */
export function filledCommentary(rows: Commentary[]): Commentary[] {
  return rows
    .map((row) => ({ source: row.source.trim(), url: row.url.trim() }))
    .filter((row) => row.url !== "");
}

export interface DraftErrors {
  title?: string;
  url?: string;
  publishedAt?: string;
  commentary?: string;
}

export function validateDraft(draft: EntryDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = "Title is required.";
  if (!draft.url.trim()) {
    errors.url = "URL is required.";
  } else if (!tryNormalizeUrl(draft.url.trim())) {
    errors.url = "That doesn't look like a valid URL.";
  }
  if (!draft.publishedAt) {
    errors.publishedAt = "Published date is required.";
  } else if (Number.isNaN(Date.parse(draft.publishedAt))) {
    errors.publishedAt = "Use a YYYY-MM-DD date.";
  }
  const links = filledCommentary(draft.commentary);
  if (links.some((row) => !tryNormalizeUrl(row.url))) {
    errors.commentary = "One of the commentary links isn't a valid URL.";
  } else if (links.some((row) => !row.source)) {
    errors.commentary = "Every commentary link needs a name — it is the link's only label.";
  }
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Draft → the record that lands in data/entries.json. Empty optional fields are
 * dropped rather than written as `""`/`[]`, so hand-edited and form-written
 * entries look the same and diffs stay small.
 */
export function draftToEntry(draft: EntryDraft): EntryInput {
  const source = draft.source.trim();
  const series = normalizeSeries(draft.series);
  const entry: EntryInput = {
    title: draft.title.trim(),
    url: draft.url.trim(),
    publishedAt: draft.publishedAt,
  };
  if (source) entry.source = source;
  if (series) entry.series = series;
  if (draft.tags.length > 0) entry.tags = [...draft.tags];
  const commentary = filledCommentary(draft.commentary);
  if (commentary.length > 0) entry.commentary = commentary;
  return entry;
}

/** Stable key order, so the JSON stays readable and diffs stay minimal. */
const KEY_ORDER: (keyof EntryInput)[] = [
  "title",
  "url",
  "source",
  "publishedAt",
  "series",
  "tags",
  "commentary",
];

/**
 * One record in its canonical on-disk shape: fixed key order, tags sorted
 * alphabetically. Every serialization path goes through here, so hand-edited
 * and form-written entries stay identical and diffs stay minimal.
 */
export function normalizeEntry(entry: EntryInput): EntryInput {
  const ordered: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (entry[key] !== undefined) ordered[key] = entry[key];
  }
  if (entry.tags) ordered.tags = entry.tags.toSorted((a, b) => a.localeCompare(b));
  // Key order fixed here too, but the rows keep the order they were written in:
  // unlike tags, which one to read first is a judgement the curator made.
  if (entry.commentary) {
    ordered.commentary = entry.commentary.map((row) => ({ source: row.source, url: row.url }));
  }
  return ordered as unknown as EntryInput;
}

/** The exact text written to data/entries.json — 2-space indent, trailing newline. */
export function serializeEntries(entries: EntryInput[]): string {
  return `${JSON.stringify(entries.map(normalizeEntry), null, 2)}\n`;
}

/** A single entry, formatted for the copy-to-clipboard path. */
export function serializeEntry(entry: EntryInput): string {
  return JSON.stringify(normalizeEntry(entry), null, 2);
}
