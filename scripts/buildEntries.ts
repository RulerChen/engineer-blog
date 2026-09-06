import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EntryInput } from "../src/lib/entry.js";
import { normalizeEntryType } from "../src/lib/entryType.js";
import { iconKey, parseIconFile } from "../src/lib/icon.js";
import type { Article } from "../src/types.js";
import { articleId } from "./articleId.js";
import { readEntries } from "./readEntries.js";

/** Bare YYYY-MM-DD is treated as UTC midnight; anything else is passed through. */
function toIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
}

/** The one or two files a company's mark is drawn across. */
export interface IconFiles {
  light: string;
  dark?: string;
}

/**
 * Source key -> icon file names, read off the files fetchIcons.ts left in
 * public/icons/. The directory listing *is* the manifest: a hand-dropped SVG
 * for a company whose favicon looks bad needs no second place to be registered.
 */
export async function readIcons(dir: string): Promise<Map<string, IconFiles>> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const icons = new Map<string, IconFiles>();
  for (const file of files.toSorted()) {
    const parsed = parseIconFile(file);
    if (!parsed) continue;
    const entry = icons.get(parsed.key) ?? { light: "" };
    if (parsed.dark) entry.dark = file;
    else entry.light = file;
    icons.set(parsed.key, entry);
  }
  // A lone `x.dark.svg` is half a pair and reads on neither card on its own.
  return new Map([...icons].filter(([, entry]) => entry.light));
}

export function toArticle(input: EntryInput, icons?: Map<string, IconFiles>): Article {
  const article: Article = {
    id: articleId(input.url),
    title: input.title,
    url: input.url,
    // Unset or misspelled by hand both read as an article, so every card gets an icon.
    type: normalizeEntryType(input.type),
    source: input.source ?? "",
    publishedAt: toIso(input.publishedAt),
    tags: input.tags ?? [],
  };
  // All three left off entirely when absent — most entries are standalone, have
  // no write-ups and are not summarized yet, and articles.json is shipped to
  // every visitor.
  const summary = input.summary?.trim();
  if (summary) article.summary = summary;
  if (input.series) article.series = input.series;
  if (input.commentary?.length) article.commentary = input.commentary;
  const key = iconKey(input.source);
  const icon = key ? icons?.get(key) : undefined;
  if (icon) article.icon = icon.light;
  if (icon?.dark) article.iconDark = icon.dark;
  return article;
}

/**
 * Entry records → the articles.json the frontend fetches. Later duplicates of
 * the same url win (so re-adding an entry updates it), and the result is sorted
 * newest-first because the UI renders it in order.
 */
export function buildArticles(inputs: EntryInput[], icons?: Map<string, IconFiles>): Article[] {
  const byId = new Map<string, Article>();
  for (const input of inputs) {
    const article = toArticle(input, icons);
    byId.set(article.id, article);
  }
  return [...byId.values()].toSorted(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

async function main(): Promise<void> {
  const outDir = fileURLToPath(new URL("../public/", import.meta.url));
  const inputs = await readEntries();
  const icons = await readIcons(join(outDir, "icons"));
  const articles = buildArticles(inputs, icons);
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
