export interface Article {
  id: string; // sha1 of normalized URL — stable dedup key
  title: string;
  url: string;
  source: string; // source id, e.g. "meta"
  publishedAt: string; // ISO 8601
  tags: string[]; // from RSS categories or scraped labels; may be empty
  summary: string; // RSS description, HTML-stripped, truncated to ~300 chars
  thumbnail: string | null; // cover image URL if the feed provides one
  fetchedAt: string; // ISO 8601, first time this article was seen
}

export interface Source {
  id: string; // "google", "meta", ...
  name: string; // "Meta Engineering"
  fetch: () => Promise<Article[]>; // daily strategy (RSS for all v1 sources)
  backfill?: () => Promise<Article[]>; // optional one-time archive scraper
}
