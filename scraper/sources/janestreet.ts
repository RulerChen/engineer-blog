import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Jane Street Tech Blog (`blog.janestreet.com`, linked from
 * `janestreet.com/tech-blog/`).
 *
 * The feed (`blog.janestreet.com/feed.xml`) is real RSS 2.0 with a genuine
 * `<pubDate>` on every item (verified against the raw XML, not just
 * assumed) and is unusually deep for an RSS feed — 100 items spanning
 * 2016-05-23 through 2026-06-15 at capture time — so it already
 * functions as a full archive. There is no separate paginated archive page
 * on the site with more history than the feed, so `backfill` reuses the
 * same feed fetch rather than a custom archive parser (same pattern as the
 * `datadog` source). Items carry no `<category>` tags.
 */
export const janestreet: Source = {
  id: "janestreet",
  name: "Jane Street",
  fetch: () => fetchRss("https://blog.janestreet.com/feed.xml", "janestreet"),
  backfill: () => fetchRss("https://blog.janestreet.com/feed.xml", "janestreet"),
};
