import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * `medium.com/paypal-tech` ("The PayPal Technology Blog") is PayPal's
 * engineering blog; there's no separate paypal-engineering.com or similar
 * self-hosted domain. Its RSS feed (`medium.com/feed/paypal-tech`) carries a
 * real `<pubDate>` on every item — verified against the raw XML, e.g. `Mon,
 * 15 Jun 2026 21:19:29 GMT` on the newest item — so no archive parser is
 * needed; this follows the RSS-only pattern already used for airbnb.ts and
 * pinterest.ts. Medium profile pages don't expose a workable paginated
 * archive (they're infinite-scroll/JS-rendered with no plain HTML listing),
 * so only `fetch` is implemented; no `backfill`.
 */
export const paypal: Source = {
  id: "paypal",
  name: "PayPal Engineering",
  fetch: () => fetchRss("https://medium.com/feed/paypal-tech", "paypal"),
};
