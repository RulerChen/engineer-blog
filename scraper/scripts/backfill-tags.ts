import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveTags } from "../src/tags.js";
import type { Article } from "../src/types.js";

/**
 * One-off retroactive pass: applies the new title/summary fallback in
 * `resolveTags` to articles already on disk with `tags: []`, without
 * re-fetching any feeds. Existing non-empty tags are left untouched.
 */
const dir = join(import.meta.dirname, "..", "..", "data", "articles");
let totalBefore = 0;
let totalAfter = 0;
let changedArticles = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const path = join(dir, file);
  const articles: Article[] = JSON.parse(readFileSync(path, "utf8"));
  let changed = false;
  for (const article of articles) {
    totalBefore += article.tags.length === 0 ? 1 : 0;
    if (article.tags.length > 0) continue;
    const inferred = resolveTags([], article.source, `${article.title} ${article.summary}`);
    if (inferred.length > 0) {
      article.tags = inferred;
      changed = true;
      changedArticles += 1;
    }
  }
  totalAfter += articles.filter((a) => a.tags.length === 0).length;
  if (changed) {
    writeFileSync(path, JSON.stringify(articles, null, 2) + "\n", "utf8");
  }
}

console.log(`Backfilled ${changedArticles} articles.`);
console.log(`Empty-tag count: ${totalBefore} -> ${totalAfter}`);
