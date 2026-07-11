import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Cockroach Labs Blog.
 *
 * `www.cockroachlabs.com/blog/feed.xml` and `/blog/rss.xml` both 404, and
 * neither `/blog/` nor its `/blog/engineering/` topic page (a Next.js app —
 * no WordPress-style pagination, no `__NEXT_DATA__` payload; posts are
 * server-rendered directly into the card markup) advertises a
 * `<link rel="alternate" type="application/rss+xml">` in `<head>`.
 *
 * The site does serve a real, site-wide feed at the bare domain root,
 * `https://www.cockroachlabs.com/rss.xml` (generator: "RSS for Node"),
 * covering every blog category (engineering, product, AI, culture, etc.) —
 * the closest match to "Cockroach Labs Blog" as a whole rather than one
 * topic slice. Every item carries a genuine `<pubDate>` (verified against
 * the raw XML, not just assumed). It's already a deep archive: 100 items
 * spanning 2021-02-22 through 2026-07-08 at capture time, so no separate
 * archive scraper is needed or available — `backfill` reuses the same feed
 * fetch, same as Datadog's. Items carry no `<category>`/tag or
 * enclosure/thumbnail data.
 */
export const cockroachlabs: Source = {
  id: "cockroachlabs",
  name: "Cockroach Labs",
  fetch: () => fetchRss("https://www.cockroachlabs.com/rss.xml", "cockroachlabs"),
  backfill: () => fetchRss("https://www.cockroachlabs.com/rss.xml", "cockroachlabs"),
};
