import type { EntryKind } from "../types.js";
import { tryNormalizeUrl } from "./url.js";

/**
 * Shape of one hand-written record in data/entries.json. This is the file's
 * contract: the entry form writes it, the build script reads it, and it stays
 * editable by hand. `id` is derived from `url` at build time, never stored.
 */
export interface EntryInput {
  kind?: EntryKind;
  title: string;
  url: string;
  source?: string;
  publishedAt: string; // YYYY-MM-DD or full ISO 8601
  tags?: string[];
  addedAt?: string; // ISO 8601; defaults to publishedAt
}

/** Editable form state, before validation turns it into an EntryInput. */
export interface EntryDraft {
  kind: EntryKind;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
}

export function emptyDraft(): EntryDraft {
  return {
    kind: "article",
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
 * entries look the same and diffs stay small. `addedAt` is passed in so callers
 * control the clock (and tests stay deterministic).
 */
export function draftToEntry(draft: EntryDraft, addedAt: string): EntryInput {
  const source = draft.source.trim();
  const entry: EntryInput = {
    kind: draft.kind,
    title: draft.title.trim(),
    url: draft.url.trim(),
    publishedAt: draft.publishedAt,
    addedAt,
  };
  if (source) entry.source = source;
  if (draft.tags.length > 0) entry.tags = [...draft.tags];
  return entry;
}

/** Stable key order, so the JSON stays readable and diffs stay minimal. */
const KEY_ORDER: (keyof EntryInput)[] = [
  "kind",
  "title",
  "url",
  "source",
  "publishedAt",
  "tags",
  "addedAt",
];

export function orderEntryKeys(entry: EntryInput): EntryInput {
  const ordered: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (entry[key] !== undefined) ordered[key] = entry[key];
  }
  return ordered as unknown as EntryInput;
}

/** The exact text written to data/entries.json — 2-space indent, trailing newline. */
export function serializeEntries(entries: EntryInput[]): string {
  return `${JSON.stringify(entries.map(orderEntryKeys), null, 2)}\n`;
}

/** A single entry, formatted for the copy-to-clipboard path. */
export function serializeEntry(entry: EntryInput): string {
  return JSON.stringify(orderEntryKeys(entry), null, 2);
}
