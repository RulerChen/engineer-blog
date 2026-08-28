import { tryNormalizeUrl } from "./url.js";

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
  tags?: string[];
}

/** Editable form state, before validation turns it into an EntryInput. */
export interface EntryDraft {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
}

export function emptyDraft(): EntryDraft {
  return {
    title: "",
    url: "",
    source: "",
    publishedAt: "",
    tags: [],
  };
}

export interface DraftErrors {
  title?: string;
  url?: string;
  publishedAt?: string;
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
  const entry: EntryInput = {
    title: draft.title.trim(),
    url: draft.url.trim(),
    publishedAt: draft.publishedAt,
  };
  if (source) entry.source = source;
  if (draft.tags.length > 0) entry.tags = [...draft.tags];
  return entry;
}

/** Stable key order, so the JSON stays readable and diffs stay minimal. */
const KEY_ORDER: (keyof EntryInput)[] = ["title", "url", "source", "publishedAt", "tags"];

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
