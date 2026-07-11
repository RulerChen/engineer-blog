// Keep in sync with scraper/src/types.ts (single source of truth for the data shape).
export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO 8601
  tags: string[];
  summary: string;
  thumbnail: string | null;
  fetchedAt: string; // ISO 8601
}
