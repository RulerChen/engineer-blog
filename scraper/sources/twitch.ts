import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Twitch Engineering.
 *
 * Twitch's current, actively-updated engineering content lives at
 * `blog.twitch.tv/en/tags/engineering/` (verified real posts through at
 * least June 2025, e.g. "Views pwn Tables as data interfaces" dated
 * 2024-12-05 and "Leveling Up Customer Experience Monitoring at Twitch: The
 * QoUX Journey" dated 2025-06-26 — both confirmed via a real
 * `<meta itemprop=datePublished>` on the individual post pages). That tag
 * page itself, however, ships as an empty shell
 * (`<div class="text-center text-7xl"></div>` with no post markup at all)
 * — the listing is populated client-side by Alpine.js + a pagefind
 * WASM/JS search index, not server-rendered HTML. This isn't specific to
 * "engineering": the same empty-shell behavior was confirmed for other,
 * definitely-populated tags (`/en/tags/twitchcon/`, `/en/tags/gaming/`,
 * `/en/tags/community/`), so there is no cheerio-parseable listing here.
 * Compounding that, engineering posts are also excluded from the general
 * `/en/archive/<year>/` index (e.g. the Dec-2024 archive page lists other
 * Dec 5 2024 posts but omits the engineering one published that same day),
 * and no RSS/Atom feed exists anywhere on the `blog.twitch.tv` domain
 * (`/en/rss.xml`, `/rss.xml`, `/en/tags/engineering/rss.xml` etc. all 403 —
 * S3-backed with no such object). So the live blog has no scrapeable path
 * with this project's fetch+cheerio approach.
 *
 * The one genuinely real, per-item-dated, plain-HTTP-fetchable source is
 * Twitch's legacy Medium presence: `medium.com/twitch-news` (their old
 * "Twitch Blog" Medium publication, pre-dating the current in-house CMS)
 * exposes a real RSS feed filtered to the "engineering" tag, and its items
 * are genuinely technical (Go memory ballast/GC tuning, a GAN for emote
 * generation, a Twirp RPC framework writeup, FFmpeg transcoding
 * comparisons, Objective-C sum types, etc. — verified against the raw XML,
 * not assumed) with real `<pubDate>` values from 2017-10-10 through
 * 2019-07-24. Twitch appears to have moved off Medium onto its own CMS
 * after 2019, so this feed is a frozen historical slice rather than a
 * live-updating one — `fetch` will keep re-seeing the same ~10 items
 * (harmless no-ops after the first run, same as any other RSS source once
 * it stops publishing) rather than surfacing new posts. There's no fuller
 * archive available for this feed (Medium's own tag-archive page is a
 * client-rendered SPA redirect, `medium.com/twitch-news/all?topic=engineering`,
 * with no server-rendered post list), so `backfill` reuses the same feed
 * fetch rather than a separate archive scraper — this is the deepest
 * history obtainable here.
 */
export const twitch: Source = {
  id: "twitch",
  name: "Twitch Engineering",
  fetch: () => fetchRss("https://medium.com/feed/twitch-news/tagged/engineering", "twitch"),
  backfill: () => fetchRss("https://medium.com/feed/twitch-news/tagged/engineering", "twitch"),
};
