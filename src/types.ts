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
}
