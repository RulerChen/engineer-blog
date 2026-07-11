import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Hugging Face blog (`huggingface.co/blog`).
 *
 * The blog exposes a real feed at `/blog/feed.xml` (`/blog/rss.xml` 404s —
 * the site's generic 404 page, not the feed) with a genuine per-item
 * `<pubDate>` (verified against the raw XML, down to the exact date/time for
 * recent posts). The feed is unusually deep — 823 items at capture time,
 * spanning Feb 2020 through the present — so it already functions as the
 * blog's full archive; there's no separate paginated listing page needed
 * (or available: the live `/blog` page is client-rendered with no dates in
 * its static markup). `backfill` reuses the same feed fetch rather than a
 * separate archive scraper, since there is no fuller history available
 * anywhere else on the site. Items carry no `<category>`/tag, description,
 * or enclosure data.
 */
export const huggingface: Source = {
  id: "huggingface",
  name: "Hugging Face",
  fetch: () => fetchRss("https://huggingface.co/blog/feed.xml", "huggingface"),
  backfill: () => fetchRss("https://huggingface.co/blog/feed.xml", "huggingface"),
};
