import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const meta: Source = {
  id: "meta",
  name: "Meta Engineering",
  fetch: () => fetchRss("https://engineering.fb.com/feed/", "meta"),
};
