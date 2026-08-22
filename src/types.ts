/** What kind of thing an entry points at. Papers get a badge in the list. */
export type EntryKind = "article" | "paper";

/** A single curated entry, as consumed by the frontend. */
export interface Article {
  id: string;
  kind: EntryKind;
  title: string;
  url: string;
  /** Company or blog the entry came from. */
  source: string;
  publishedAt: string; // ISO 8601
  tags: string[];
  addedAt: string; // ISO 8601
}
