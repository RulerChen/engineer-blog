import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Datadog Engineering blog.
 *
 * `www.datadoghq.com/blog/engineering/` is a client-side-rendered hub page
 * (its "Latest Articles" grid ships as skeleton-loader placeholders in the
 * initial HTML, populated by JS after load) with no dates anywhere in the
 * static markup and no pagination — so it can't serve as an archive-parser
 * target the way the other sources' listing pages do.
 *
 * The page's `<head>` does advertise a real, engineering-specific RSS feed
 * (`<link rel="alternate" type="application/rss+xml" title="Datadog |
 * Engineering blog" href="https://www.datadoghq.com/blog/engineering/index.xml">`),
 * and unlike Google's/Uber's broken feeds, every item here carries a genuine
 * `<pubDate>` (verified against the raw XML, not just assumed). The feed is
 * also unusually deep for an RSS feed — 96 items spanning 2016-07-11 through
 * 2026-07-01 at capture time — so it already functions as a full archive.
 * `backfill` reuses the same feed fetch rather than a separate archive
 * scraper, since there is no fuller history available anywhere else on the
 * site. Items carry no `<category>`/tag or enclosure data.
 */
export const datadog: Source = {
  id: "datadog",
  name: "Datadog Engineering",
  fetch: () => fetchRss("https://www.datadoghq.com/blog/engineering/index.xml", "datadog"),
  backfill: () => fetchRss("https://www.datadoghq.com/blog/engineering/index.xml", "datadog"),
};
