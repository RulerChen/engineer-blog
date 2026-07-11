import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Instacart Engineering blog (`tech.instacart.com`) is a custom domain
 * mapped onto the Medium publication "tech-at-instacart". Its `/feed`
 * (`https://tech.instacart.com/feed`) is a genuine Medium RSS feed with a
 * real per-item `<pubDate>` (verified against the raw XML), so no archive
 * scraper is needed. The publication's own listing pages are client-rendered
 * by Medium's JS/GraphQL app with no server-rendered dates, so — same as
 * Airbnb/Pinterest — there's no workable paginated archive to back-fill from;
 * `fetch` is the only strategy.
 */
export const instacart: Source = {
  id: "instacart",
  name: "Instacart Engineering",
  fetch: () => fetchRss("https://tech.instacart.com/feed", "instacart"),
};
