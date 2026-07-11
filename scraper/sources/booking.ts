import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * `booking.ai` is Booking.com's engineering-blog vanity domain; it redirects
 * to `medium.com/booking-com-data-science` ("Booking.com ML & DS Blog"), the
 * actual publication with real posts. Direct requests to `booking.ai` itself
 * are blocked in this sandbox by a Cloudflare bot challenge (the domain even
 * serves a TLS cert for `*.booking.com`, not `booking.ai`, so the redirect
 * target had to be confirmed via an insecure fetch), but the underlying
 * Medium feed is reachable directly. Its RSS
 * (`medium.com/feed/booking-com-data-science`) carries a real `<pubDate>` on
 * every item — verified against the raw XML, e.g. `Fri, 10 Jul 2026 07:52:18
 * GMT` on the newest item — so no archive parser is needed; this follows the
 * RSS-only pattern already used for airbnb.ts and pinterest.ts. Medium
 * profile pages don't expose a workable paginated archive (infinite-
 * scroll/JS-rendered, no plain HTML listing), so only `fetch` is
 * implemented; no `backfill`.
 */
export const booking: Source = {
  id: "booking",
  name: "Booking.com Engineering",
  fetch: () => fetchRss("https://medium.com/feed/booking-com-data-science", "booking"),
};
