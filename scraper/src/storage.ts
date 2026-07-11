import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Article } from "./types.js";

export async function readSourceArticles(dataDir: string, sourceId: string): Promise<Article[]> {
  try {
    return JSON.parse(await readFile(join(dataDir, `${sourceId}.json`), "utf8")) as Article[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeSourceArticles(
  dataDir: string,
  sourceId: string,
  articles: Article[],
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    join(dataDir, `${sourceId}.json`),
    JSON.stringify(articles, null, 2) + "\n",
    "utf8",
  );
}
