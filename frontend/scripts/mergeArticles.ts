import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Article } from "../src/types.js";

export function mergeArticleFiles(perSource: Article[][]): Article[] {
  return perSource.flat().toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

async function main(): Promise<void> {
  const dataDir = fileURLToPath(new URL("../../data/articles/", import.meta.url));
  const outDir = fileURLToPath(new URL("../public/", import.meta.url));
  const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json"));
  const perSource = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(join(dataDir, f), "utf8")) as Article[]),
  );
  const merged = mergeArticleFiles(perSource);
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
