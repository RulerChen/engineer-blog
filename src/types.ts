import type { EntryType } from "./lib/entryType.js";

/**
 * Someone else's write-up about an entry — a walkthrough or a set of notes, not
 * the original. Only who wrote it, where, and what shape it is: the card labels
 * the link with the name, so a second title would have nowhere to go.
 */
export interface Commentary {
  source: string;
  url: string;
  /** Left off for an article, the common case; the chip's icon reads it. */
  type?: EntryType;
}

/** A single curated entry, as consumed by the frontend. */
export interface Article {
  id: string;
  title: string;
  url: string;
  /** What it is — article, paper, book, video. Always set by the build script. */
  type: EntryType;
  /** Company or blog the entry came from. */
  source: string;
  /**
   * File name of the source's icon under public/icons/, when one has been fetched.
   * Absent for a company no icon could be found for — the card letters it instead.
   */
  icon?: string;
  /**
   * The same mark drawn for a dark card, when the logo is monochrome and needs
   * two files. Absent for a full-colour logo, which reads on either theme.
   */
  iconDark?: string;
  publishedAt: string; // ISO 8601
  /** Series slug shared with the other parts, when the entry is one of several. */
  series?: string;
  tags: string[];
  /** Other people's write-ups about this entry, in the order they should be read. */
  commentary?: Commentary[];
}
