/**
 * Someone else's write-up about an entry — a walkthrough or a set of notes, not
 * the original. Only who wrote it and where: the card labels the link with the
 * name, so a second title would have nowhere to go.
 */
export interface Commentary {
  source: string;
  url: string;
}

/** A single curated entry, as consumed by the frontend. */
export interface Article {
  id: string;
  title: string;
  url: string;
  /** Company or blog the entry came from. */
  source: string;
  publishedAt: string; // ISO 8601
  /** Series slug shared with the other parts, when the entry is one of several. */
  series?: string;
  tags: string[];
  /** Other people's write-ups about this entry, in the order they should be read. */
  commentary?: Commentary[];
}
