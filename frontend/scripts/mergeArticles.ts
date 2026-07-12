import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Article } from "../src/types.js";
import { excludedIds, filterExcluded, type ExclusionEntry } from "./exclude.js";
import { toArticle, type ManualArticleInput } from "./manual.js";

/**
 * Flattens per-source articles with any hand-added manual articles (scraped data
 * wins on id conflict, so a real scrape supersedes a manual placeholder), then
 * drops anything listed in data/excluded.json.
 */
export function mergeArticleFiles(
  perSource: Article[][],
  manual: Article[] = [],
  excluded: Set<string> = new Set(),
): Article[] {
  const byId = new Map<string, Article>();
  for (const article of manual) byId.set(article.id, article);
  for (const article of perSource.flat()) byId.set(article.id, article);
  return filterExcluded([...byId.values()], excluded).toSorted(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function main(): Promise<void> {
  const dataDir = fileURLToPath(new URL("../../data/articles/", import.meta.url));
  const manualPath = fileURLToPath(new URL("../../data/manual.json", import.meta.url));
  const excludedPath = fileURLToPath(new URL("../../data/excluded.json", import.meta.url));
  const outDir = fileURLToPath(new URL("../public/", import.meta.url));
  const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json"));
  const perSource = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(join(dataDir, f), "utf8")) as Article[]),
  );
  const manualInputs = await readJson<ManualArticleInput[]>(manualPath, []);
  const manual = manualInputs.map(toArticle);
  const excluded = excludedIds(await readJson<ExclusionEntry[]>(excludedPath, []));

  const merged = mergeArticleFiles(perSource, manual, excluded);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "articles.json"), JSON.stringify(merged), "utf8");
  console.log(`wrote ${merged.length} articles from ${files.length} source files`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
) {
  await main();
}
