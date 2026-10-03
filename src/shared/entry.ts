// The entry contract between the hand-written files in data/ and the articles.json the site fetches.

/** What an entry is, as opposed to what it is about; closed because the card draws an icon per value. */
export type EntryType = "article" | "paper" | "book" | "video" | "course";

const ENTRY_TYPES = new Set<string>(["article", "paper", "book", "video", "course"]);

/** Unset or misspelled by hand both read as an article, so every card still gets an icon. */
export function normalizeEntryType(raw: string | undefined): EntryType {
  return raw !== undefined && ENTRY_TYPES.has(raw) ? (raw as EntryType) : "article";
}

/** Someone else's write-up about an entry; the card labels the link with the source, so it has no title. */
export interface Commentary {
  source: string;
  url: string;
  /** Left off for an article. */
  type?: EntryType;
}

/** One hand-written record in data/<source>.json; the id is derived from the url at build time. */
export interface EntryInput {
  title: string;
  url: string;
  /** Left off for an article. */
  type?: EntryType;
  source?: string;
  /** YYYY-MM-DD or full ISO 8601. */
  publishedAt: string;
  /** One or two sentences, optional and backfilled by hand; length is checked in scripts/lib/validate.ts. */
  summary?: string;
  /** Same slug, same series. */
  series?: string;
  /** Papers only: exactly one id from src/shared/paperTopics.ts. */
  topic?: string;
  /** Blog entries only: exactly one domain from src/shared/tags.ts. */
  domain?: string;
  /** Concepts, cross-domain concepts, technologies and at most one second domain, all from src/shared/tags.ts. */
  tags?: string[];
  /** In the order they should be read. */
  commentary?: Commentary[];
}

/** One entry as articles.json ships it; optional fields are left off when absent to keep the file small. */
export interface Article {
  /** sha1 of the normalized url. */
  id: string;
  title: string;
  url: string;
  type: EntryType;
  source: string;
  /** File name under public/icons/, when the source has one. */
  icon?: string;
  /** The dark-theme copy of a monochrome logo. */
  iconDark?: string;
  /** ISO 8601. */
  publishedAt: string;
  summary?: string;
  series?: string;
  domain: string;
  /** Sorted by sortTags: a second domain, concepts, cross-domain concepts, technologies. */
  tags: string[];
  commentary?: Commentary[];
}
