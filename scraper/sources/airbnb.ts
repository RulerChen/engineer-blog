import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

export const airbnb: Source = {
  id: "airbnb",
  name: "Airbnb Engineering",
  fetch: () => fetchRss("https://medium.com/feed/airbnb-engineering", "airbnb"),
};
