import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

/**
 * Lyft Engineering is a Medium-hosted publication (`eng.lyft.com`). Its RSS
 * feed (`eng.lyft.com/feed`) is genuine Medium-generated XML with a real
 * per-item `pubDate` (verified against the raw feed, e.g. `Thu, 09 Jul 2026
 * 22:01:15 GMT`), so `fetchRss` is used directly, as with the other
 * Medium-hosted sources (airbnb, pinterest).
 *
 * No `backfill` is implemented: Medium's own archive page for this
 * publication (`eng.lyft.com/archive/<year>`, which redirects to
 * `eng.lyft.com/all?year=<year>`) is a client-side-rendered React app — the
 * server-rendered HTML has no post data in the DOM and no post data in the
 * page's `__APOLLO_STATE__`/Apollo cache either (checked directly; zero
 * `"__typename":"Post"` entries in the initial payload for a year-filtered
 * archive page), and its CSS classes are build-hashed (e.g. `class="by y bz
 * ca cb ac cc ae af ag ah ai aj ak al"`) with no stable selector to target —
 * matching why Airbnb/Pinterest also ship RSS-only.
 */
export const lyft: Source = {
  id: "lyft",
  name: "Lyft Engineering",
  fetch: () => fetchRss("https://eng.lyft.com/feed", "lyft"),
};
