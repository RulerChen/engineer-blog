import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Google DeepMind blog (`deepmind.google/blog/`).
 *
 * The site is a heavily JS-rendered React app: the server-rendered listing
 * page's cards carry only a coarse `<time datetime="May 2026">May 2026</time>`
 * (month + year, no day) and no embedded per-post JSON payload analogous to
 * Canva's `__NEXT_DATA__` — not usable as a dated archive source, and
 * `?page=2` returns byte-identical HTML (pagination is client-side only, not
 * a real paginated route).
 *
 * The site does, however, expose a real RSS feed at `/blog/rss.xml` (found
 * via `<link rel="alternate" type="application/rss+xml">` in the page head)
 * with a genuine per-item `<pubDate>` down to the second (verified against
 * the raw XML) — 100 items at capture time, spanning late Oct 2025 through
 * the present. The feed doesn't paginate (`?page=2` returns the same 100
 * items), so this is also the deepest history available anywhere on the
 * site; `backfill` reuses the same feed fetch rather than a separate archive
 * scraper. Items carry no `<category>`; thumbnails are served via
 * `<media:thumbnail>`, which the shared RSS parser doesn't read, so
 * `thumbnail` is always `null`.
 */
export const deepmind: Source = {
  id: "deepmind",
  name: "Google DeepMind",
  fetch: () => fetchRss("https://deepmind.google/blog/rss.xml", "deepmind"),
  backfill: () => fetchRss("https://deepmind.google/blog/rss.xml", "deepmind"),
};
