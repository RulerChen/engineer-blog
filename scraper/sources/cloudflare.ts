import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * The Cloudflare Blog covers all of Cloudflare's product/company news, not
 * just engineering, so `/rss/` (the whole-blog feed) isn't engineering-scoped.
 * `blog.cloudflare.com/tag/engineering/rss/` is a real, tag-filtered RSS feed
 * (verified: every item's raw XML carries a genuine per-item `<pubDate>`, not
 * just title/link) that only contains engineering-tagged posts.
 *
 * Neither feed nor the human-facing `/tag/engineering/` listing page paginates:
 * both consistently cap at the same ~19-20 most recent engineering posts (the
 * listing page has no "load more"/cursor/page-N control, and `?page=2` on the
 * feed silently returns byte-identical content to page 1). So there is no
 * deeper, dated archive to backfill from — this source is RSS-only, like
 * Airbnb/Pinterest.
 */
export const cloudflare: Source = {
  id: "cloudflare",
  name: "Cloudflare",
  fetch: () => fetchRss("https://blog.cloudflare.com/tag/engineering/rss/", "cloudflare"),
};
