import type { EntryInput } from "../../src/shared/entry.js";
import { ROADMAP_INDEX_FILE, roadmapFile } from "../../src/shared/roadmap.js";
import { buildArticles, isBlogEntry } from "./articles.js";
import { readIcons, readRoadmaps } from "./read.js";
import { buildRoadmaps } from "./roadmaps.js";

/** Every file the site fetches, by its path under public/; the build writes them and the dev server serves them. */
export async function siteFiles(inputs: EntryInput[]): Promise<Map<string, unknown>> {
  const icons = await readIcons();
  const articles = buildArticles(inputs, icons);
  const roadmaps = buildRoadmaps(await readRoadmaps(), articles, icons);
  return new Map<string, unknown>([
    ["articles.json", articles.filter(isBlogEntry)],
    [ROADMAP_INDEX_FILE, roadmaps.map((road) => road.id)],
    ...roadmaps.map((road) => [roadmapFile(road.id), road] as const),
  ]);
}
