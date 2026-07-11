import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const google: Source = {
  id: "google",
  name: "Google Developers",
  fetch: () => fetchRss("https://developers.googleblog.com/feeds/posts/default?alt=rss", "google"),
};
