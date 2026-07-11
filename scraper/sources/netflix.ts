import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const netflix: Source = {
  id: "netflix",
  name: "Netflix Tech Blog",
  fetch: () => fetchRss("https://netflixtechblog.com/feed", "netflix"),
};
