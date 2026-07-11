import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Etsy's engineering blog ("Code as Craft") serves a real, dated RSS feed at
 * `codeascraft.com/feed/` (redirects from `www.codeascraft.com` are blocked,
 * but the bare `codeascraft.com` host responds 200) with a genuine `pubDate`
 * on every item — confirmed by inspecting the raw XML.
 *
 * No backfill: the blog's own archive lives on `www.etsy.com/codeascraft/`
 * (and `codeascraft.com/`'s homepage/`/page/N/` all redirect there), which is
 * behind DataDome bot protection and returns a JS challenge page instead of
 * post markup for every request tried, including with a browser-like
 * User-Agent. The feed itself doesn't support real pagination either — both
 * `?paged=2` and the bare feed return byte-identical content (WordPress
 * ignores the query param here) — so only the most recent ~20 posts are
 * reachable at all.
 */
export const etsy: Source = {
  id: "etsy",
  name: "Etsy Engineering",
  fetch: () => fetchRss("https://codeascraft.com/feed/", "etsy"),
};
