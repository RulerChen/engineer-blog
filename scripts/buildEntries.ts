import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EntryInput } from "../src/lib/entry.js";
import { normalizeEntryType } from "../src/lib/entryType.js";
import { iconKey, parseIconFile } from "../src/lib/icon.js";
import type { Roadmap, RoadmapInput, RoadmapItem, RoadmapItemInput } from "../src/lib/roadmap.js";
import { topicLabel } from "../src/lib/topicMap.js";
import { normalizeUrl } from "../src/lib/url.js";
import type { Article } from "../src/types.js";
import { articleId } from "./articleId.js";
import { readEntries, readRoadmaps } from "./readEntries.js";

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

function toArticle(input: EntryInput, icons?: Map<string, IconFiles>): Article {
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
  if (input.topic) article.topic = input.topic;
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

/** The blog entries the list shows; papers are only reached through roadmaps. */
export function blogEntries(entries: Article[]): Article[] {
  return entries.filter((entry) => entry.type !== "paper");
}

/** Fills an item from the list entry with its url; an unmatched url with no title is a typo and stops the build. */
function resolveItem(
  input: RoadmapItemInput,
  byUrl: Map<string, Article>,
  icons: Map<string, IconFiles> | undefined,
  where: string,
): RoadmapItem {
  const entry = byUrl.get(normalizeUrl(input.url));
  let item: RoadmapItem;
  if (entry) {
    item = {
      url: entry.url,
      type: entry.type,
      title: entry.title,
      source: entry.source,
      year: entry.publishedAt.slice(0, 4),
    };
    if (entry.icon) item.icon = entry.icon;
    if (entry.iconDark) item.iconDark = entry.iconDark;
  } else {
    if (!input.title) {
      throw new Error(`${where}: ${input.url} is not on the list and has no title`);
    }
    item = { url: input.url, type: normalizeEntryType(input.type), title: input.title };
    if (input.source) item.source = input.source;
    if (input.year) item.year = input.year;
    const key = iconKey(input.source);
    const icon = key ? icons?.get(key) : undefined;
    if (icon) item.icon = icon.light;
    if (icon?.dark) item.iconDark = icon.dark;
  }
  if (input.scope) item.scope = input.scope;
  if (input.why) item.why = input.why;
  return item;
}

/** A relation that names no known topic would render as a blank chip. */
function checkTopics(ids: string[], where: string): string[] {
  for (const id of ids) {
    if (!topicLabel(id)) throw new Error(`${where}: unknown topic "${id}"`);
  }
  return ids;
}

/** Roadmap files → the roadmaps.json the roadmap page fetches, every item resolved. */
export function buildRoadmaps(
  inputs: RoadmapInput[],
  entries: Article[],
  icons?: Map<string, IconFiles>,
): Roadmap[] {
  const byUrl = new Map(entries.map((entry) => [normalizeUrl(entry.url), entry]));
  return inputs.map((road) => {
    checkTopics([road.id], "roadmap id");
    return {
      id: road.id,
      title: road.title,
      blurb: road.blurb,
      before: checkTopics(road.before, `${road.id}.before`),
      next: checkTopics(road.next, `${road.id}.next`),
      parts: road.parts.map((part) => ({
        name: part.name,
        goal: part.goal,
        steps: part.steps.map((step, index) => {
          const where = `${road.id} / ${part.name} step ${index + 1}`;
          const resolve = (item: RoadmapItemInput): RoadmapItem =>
            resolveItem(item, byUrl, icons, where);
          return {
            main: resolve(step.main),
            background: (step.background ?? []).map(resolve),
            alternative: (step.alternative ?? []).map(resolve),
            further: (step.further ?? []).map(resolve),
          };
        }),
      })),
    };
  });
}

async function main(): Promise<void> {
  const outDir = fileURLToPath(new URL("../public/", import.meta.url));
  const inputs = await readEntries();
  const icons = await readIcons(join(outDir, "icons"));
  const all = buildArticles(inputs, icons);
  const articles = blogEntries(all);
  const roadmaps = buildRoadmaps(await readRoadmaps(), all, icons);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "articles.json"), JSON.stringify(articles), "utf8");
  await writeFile(join(outDir, "roadmaps.json"), JSON.stringify(roadmaps), "utf8");
  console.log(`wrote ${articles.length} entries and ${roadmaps.length} roadmaps`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
) {
  await main();
}
