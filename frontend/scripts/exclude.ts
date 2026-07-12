import type { Article } from "../src/types.js";
import { articleId } from "./articleId.js";

// Keep in sync with scraper/src/exclude.ts (same data/excluded.json format).
export interface ExclusionEntry {
  id?: string;
  url?: string;
  note?: string;
}

export function excludedIds(entries: ExclusionEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.id) {
      ids.add(entry.id);
      continue;
    }
    if (entry.url) {
      try {
        ids.add(articleId(entry.url));
      } catch {
        // malformed url in a hand-edited file — skip rather than fail the build
      }
    }
  }
  return ids;
}

export function filterExcluded(articles: Article[], excluded: Set<string>): Article[] {
  return articles.filter((article) => !excluded.has(article.id));
}
