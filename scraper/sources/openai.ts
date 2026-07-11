import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * OpenAI News blog.
 *
 * `openai.com/news` is a client-side-rendered listing page with no dates in
 * its static markup, but the `<head>` advertises a real feed at
 * `openai.com/news/rss.xml` (mirrored by `<atom:link rel="self">` pointing to
 * `openai.com/news/rss`), and unlike Google's/Uber's broken feeds, every one
 * of its 1,040 items carries a genuine `<pubDate>` (verified against the raw
 * XML, not just assumed) plus a `<category>` on most items. The feed is
 * unusually deep for an RSS feed — items span 2015-12-11 through the capture
 * date — so it already functions as a full archive with no separate listing
 * page needed. `backfill` reuses the same feed fetch rather than a separate
 * archive scraper, since there is no fuller history available anywhere else
 * on the site (mirrors Datadog's case).
 */
export const openai: Source = {
  id: "openai",
  name: "OpenAI",
  fetch: () => fetchRss("https://openai.com/news/rss.xml", "openai"),
  backfill: () => fetchRss("https://openai.com/news/rss.xml", "openai"),
};
