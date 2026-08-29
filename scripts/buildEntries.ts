import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EntryInput } from "../src/lib/entry.js";
import type { Article } from "../src/types.js";
import { articleId } from "./articleId.js";

/** Bare YYYY-MM-DD is treated as UTC midnight; anything else is passed through. */
function toIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
}

export function toArticle(input: EntryInput): Article {
  const article: Article = {
    id: articleId(input.url),
    title: input.title,
    url: input.url,
    source: input.source ?? "",
    publishedAt: toIso(input.publishedAt),
    tags: input.tags ?? [],
  };
  // Both left off entirely when absent — most entries are standalone and have no
  // write-ups, and articles.json is shipped to every visitor.
  if (input.series) article.series = input.series;
  if (input.commentary?.length) article.commentary = input.commentary;
  return article;
}

/**
 * Entry records → the articles.json the frontend fetches. Later duplicates of
 * the same url win (so re-adding an entry updates it), and the result is sorted
 * newest-first because the UI renders it in order.
 */
export function buildArticles(inputs: EntryInput[]): Article[] {
  const byId = new Map<string, Article>();
  for (const input of inputs) {
    const article = toArticle(input);
    byId.set(article.id, article);
  }
  return [...byId.values()].toSorted(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

async function main(): Promise<void> {
  const entriesPath = fileURLToPath(new URL("../data/entries.json", import.meta.url));
  const outDir = fileURLToPath(new URL("../public/", import.meta.url));
  const inputs = JSON.parse(await readFile(entriesPath, "utf8")) as EntryInput[];
  const articles = buildArticles(inputs);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "articles.json"), JSON.stringify(articles), "utf8");
  console.log(`wrote ${articles.length} entries`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
) {
  await main();
}
