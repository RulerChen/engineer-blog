import { readFile } from "node:fs/promises";
import { articleId } from "./normalize.js";
import type { Article } from "./types.js";

/** One hand-maintained entry in data/excluded.json. Either key resolves to an article id. */
export interface ExclusionEntry {
  id?: string;
  url?: string;
  note?: string;
}

export async function readExclusions(path: string): Promise<ExclusionEntry[]> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as ExclusionEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/** Resolve entries to article ids, recomputing from url via the same hash used elsewhere. */
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
        // malformed url in a hand-edited file — skip rather than fail the whole run
      }
    }
  }
  return ids;
}

export function filterExcluded(articles: Article[], excluded: Set<string>): Article[] {
  return articles.filter((article) => !excluded.has(article.id));
}
