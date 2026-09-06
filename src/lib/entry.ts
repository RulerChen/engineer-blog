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
   * hand: an entry without one is a normal entry, not an unfinished one. Keep it
   * under roughly 200 characters; the card clamps at three lines.
   */
  summary?: string;
  /** Slug grouping this entry with its other parts. Same slug = same series. */
  series?: string;
  tags?: string[];
  /** Other people's write-ups about this entry — `{ source, url, type? }` each. */
  commentary?: Commentary[];
}
