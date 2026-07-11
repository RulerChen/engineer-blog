import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

// Both the spec's primary (https://www.uber.com/blog/engineering/rss/) and
// fallback (https://eng.uber.com/feed/) URLs are dead (404). This is the feed
// advertised via <link rel="alternate" type="application/rss+xml"> on
// https://eng.uber.com/ — see task-8-report.md for verification notes.
export const uber: Source = {
  id: "uber",
  name: "Uber Engineering",
  fetch: () => fetchRss("https://www.uber.com/blog/san-francisco/engineering/rss/", "uber"),
};
