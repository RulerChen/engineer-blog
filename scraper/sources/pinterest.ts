import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const pinterest: Source = {
  id: "pinterest",
  name: "Pinterest Engineering",
  fetch: () => fetchRss("https://medium.com/feed/pinterest-engineering", "pinterest"),
};
