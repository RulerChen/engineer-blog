import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * LINE Engineering blog.
 *
 * `engineering.linecorp.com/en/blog` still resolves (HTTP 200) but is now a
 * migration notice: as of October 1, 2023 LINE was rebranded as LY
 * Corporation and the engineering blog moved to
 * `techblog.lycorp.co.jp/en` — the "LY Corporation Tech Blog", which
 * explicitly covers "LY Corporation and LY Corporation Group (LINE Plus,
 * LINE Taiwan and LINE Vietnam)" per its own feed description, and regularly
 * publishes LINE-branded posts (e.g. "...at LINE Part Time Jobs"). This is
 * the actual successor/continuation of the LINE engineering blog, so it's
 * used here under the `line` source id.
 *
 * The old `engineering.linecorp.com/en/blog/feed/` now 403s. The new site's
 * `techblog.lycorp.co.jp/en/feed/index.xml` is a real RSS 2.0 feed
 * (Gatsby-generated) with a genuine `<pubDate>` per item (verified against
 * the raw XML) — 50 items spanning 2025-10-01 through 2026-06-29 at capture
 * time. The listing pages (`techblog.lycorp.co.jp/en`, `/en/page/2`, ...) are
 * a client-side-rendered Gatsby app: the static HTML ships no per-post dates
 * or even `<a>` post links, only JS bundle references, so they can't serve
 * as an archive-parser target the way the other sources' listing pages do.
 * There's also no deeper feed variant or sitemap with per-post dates
 * (`techblog.lycorp.co.jp/sitemap.xml` 404s). `backfill` reuses the same feed
 * fetch rather than a separate archive scraper, since there is no fuller
 * history available anywhere else on the site. Items carry no `<category>`
 * tag or enclosure/thumbnail data.
 */
export const line: Source = {
  id: "line",
  name: "LINE Engineering",
  fetch: () => fetchRss("https://techblog.lycorp.co.jp/en/feed/index.xml", "line"),
  backfill: () => fetchRss("https://techblog.lycorp.co.jp/en/feed/index.xml", "line"),
};
