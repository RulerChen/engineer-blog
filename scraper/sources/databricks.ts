import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Databricks Blog.
 *
 * `www.databricks.com/blog/feed.xml` is real but is the whole company blog
 * mixed together (10 items at capture time, spanning only 2026-07-06 through
 * 2026-07-10) — mostly customer-story/marketing content with no reliable way
 * to filter to engineering. The blog's "Engineering" category has its own
 * feed, `www.databricks.com/blog/category/engineering/feed.xml`, where every
 * item carries a genuine `<pubDate>` (verified against the raw XML) and a
 * `<category>Engineering</category>` tag — used here as the practical
 * "Databricks Blog" source, same reasoning as Atlassian's "How We Build".
 *
 * This feed is shallow: 20 items spanning 2026-05-21 through 2026-07-08 at
 * capture time. The `/blog/category/engineering` listing page itself is a
 * client-hydrated React app — its static HTML is identical regardless of the
 * `?page=N` query param (verified: page 1 and page 2 hash identically), it
 * embeds no `__NEXT_DATA__`-style JSON payload, and it shows no more posts
 * than the feed already does, so it can't serve as a deeper archive-parser
 * target. The site's blog sitemap (`en-blog-assets/sitemap/sitemap-0.xml`)
 * lists ~3,900 URLs across every category with no `<lastmod>` and no
 * category info, which would require an individual fetch per post (and a
 * post-page category check) to even filter down to engineering — not a
 * reasonable one-time backfill. So, like Datadog, `backfill` reuses the same
 * feed fetch; there is no fuller accessible history. Items carry no
 * enclosure data.
 */
export const databricks: Source = {
  id: "databricks",
  name: "Databricks",
  fetch: () =>
    fetchRss("https://www.databricks.com/blog/category/engineering/feed.xml", "databricks"),
  backfill: () =>
    fetchRss("https://www.databricks.com/blog/category/engineering/feed.xml", "databricks"),
};
