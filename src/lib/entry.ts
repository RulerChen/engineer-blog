import type { EntryType } from "./entryType.js";
import type { Commentary } from "../types.js";

/**
 * Shape of one hand-written record in data/<source>.json. These files are the
 * single source of truth: they are written by hand and read by the build
 * script. `id` is derived from `url` at build time, never stored.
 */
export interface EntryInput {
  title: string;
  url: string;
  /** Left off for an article — the default, and most of the list. */
  type?: EntryType;
  source?: string;
  publishedAt: string; // YYYY-MM-DD or full ISO 8601
  /**
   * One or two sentences on what the entry actually works on — the judgement
   * already made when it was picked, written down. Optional and backfilled by
   * hand: an entry without one is a normal entry, not an unfinished one. At most
   * SUMMARY_MAX characters (scripts/buildEntries.ts); the card clamps at three lines.
   */
  summary?: string;
  /** Slug grouping this entry with its other parts. Same slug = same series. */
  series?: string;
  /** Paper topic id, from src/lib/paperTopics.ts. Papers carry one; blog entries carry none. */
  topic?: string;
  /** The domain from src/lib/tags.ts the entry is mainly about; blog entries carry exactly one, papers none. */
  domain?: string;
  /** Concepts, cross-domain concepts, technologies and at most one second domain, all from src/lib/tags.ts. */
  tags?: string[];
  /** Other people's write-ups about this entry — `{ source, url, type? }` each. */
  commentary?: Commentary[];
}
