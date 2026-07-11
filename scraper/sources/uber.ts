import { fetchRss } from "../src/rss.js";
import type { Source } from "../src/types.js";

// This URL 406s from this sandbox's network (likely bot/geo protection on
// this specific outbound IP, not the URL being wrong). Web-search evidence
// confirms it's the real feed: a search-engine-indexed page shows the RSS
// CDATA title "Engineering | Uber Blog" for this exact URL. Per the
// scraper's per-source failure isolation, if it's genuinely unreachable only
// the uber source fails for a given run without breaking anything else —
// worth re-verifying once running from GitHub Actions. See task-8-report.md
// for verification notes.
export const uber: Source = {
  id: "uber",
  name: "Uber Engineering",
  fetch: () => fetchRss("https://www.uber.com/blog/engineering/rss/", "uber"),
};
