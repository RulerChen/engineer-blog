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
  /** Slug grouping this entry with its other parts. Same slug = same series. */
  series?: string;
  tags?: string[];
  /** Other people's write-ups about this entry — `{ source, url, type? }` each. */
  commentary?: Commentary[];
}
