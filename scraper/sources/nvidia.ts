import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * NVIDIA Developer Blog.
 *
 * `developer.nvidia.com/blog` (technical tutorials/deep-dives for
 * developers, data scientists, and IT admins — CUDA, LLM training/inference,
 * robotics, etc.) is a materially better fit for this aggregator than the
 * general corporate `blogs.nvidia.com`, which is press-release/marketing
 * content with no comparable engineering depth.
 *
 * `developer.nvidia.com/blog/feed` is a real Atom feed with a genuine
 * `<published>` timestamp per entry (verified against the raw XML) — 100
 * entries spanning 2026-04-24 through 2026-07-10 at capture time. Atom
 * `<category>` elements aren't picked up by the shared RSS parser's
 * `item.categories` field for this feed, and entries carry no RSS
 * `enclosure`, so tags come back empty.
 *
 * `developer.nvidia.com/blog/page/2/` etc. look like a paginated archive
 * (`<link rel="next">` in `<head>`, standard WordPress pagination), but the
 * listing is actually composed of several "latest posts" carousel widgets
 * (`.js-post-card` inside `.carousel-row__slide`) repeated per category —
 * comparing the post URLs on `/blog/` vs `/blog/page/2/` shows the exact
 * same 97 posts on both pages, so "page 2" isn't a deeper/older page at all.
 * There's a WP sitemap (`/blog/wp-sitemap-posts-post-1.xml` etc.) with
 * `<lastmod>` back to 2022, but `lastmod` is a last-modified timestamp, not
 * a verified publish date, and the sitemap has no titles/summaries/tags —
 * using it would mean fabricating dates for posts we can't otherwise date.
 * So `backfill` reuses the same feed fetch instead of a separate archive
 * scraper, since no fuller *dated* history is available.
 */
export const nvidia: Source = {
  id: "nvidia",
  name: "NVIDIA Developer Blog",
  fetch: () => fetchRss("https://developer.nvidia.com/blog/feed", "nvidia"),
  backfill: () => fetchRss("https://developer.nvidia.com/blog/feed", "nvidia"),
};
