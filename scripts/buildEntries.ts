import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EntryInput } from "../src/lib/entry.js";
import { normalizeEntryType } from "../src/lib/entryType.js";
import { iconKey, parseIconFile } from "../src/lib/icon.js";
import type {
  Evolution,
  EvolutionNode,
  Roadmap,
  RoadmapInput,
  RoadmapItem,
  RoadmapItemInput,
} from "../src/lib/roadmap.js";
import { ALIASES, facetOf, sortTags } from "../src/lib/tags.js";
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

/** Everything in one entry that breaks the vocabulary in src/lib/tags.ts, each message naming the entry. */
export function tagProblems(input: EntryInput): string[] {
  const tags = input.tags ?? [];
  const problems: string[] = [];
  const say = (message: string): void => {
    problems.push(`${input.url}: ${message}`);
  };
  if (normalizeEntryType(input.type) === "paper") {
    if (input.domain || tags.length) say("a paper carries a topic, not a domain or tags");
    return problems;
  }
  const domain = input.domain;
  if (!domain) say('no domain; "other" when nothing fits');
  else if (ALIASES.has(domain)) say(`domain "${domain}" was renamed to "${ALIASES.get(domain)}"`);
  else if (facetOf(domain) !== "domain") say(`"${domain}" is not a domain`);
  for (const id of tags) {
    if (ALIASES.has(id)) say(`"${id}" was renamed to "${ALIASES.get(id)}"`);
    else if (!facetOf(id)) say(`unknown tag "${id}"; a new technology goes in TECHNOLOGIES`);
  }
  if (tags.length > 5) say(`${tags.length} tags, at most 5`);
  if (new Set(tags).size < tags.length) say("a tag is listed twice");
  const second = tags.filter((id) => facetOf(id) === "domain");
  if (second.length > 1) say(`second domains ${second.join(", ")}; at most one`);
  if (domain && second.includes(domain)) say(`"${domain}" is already the domain`);
  return problems;
}

/** About what a phone fits in the card's three clamped lines. */
const SUMMARY_MAX = 120;

/** A summary past SUMMARY_MAX, papers included, with the message naming the entry. */
function summaryProblems(input: EntryInput): string[] {
  const length = input.summary?.trim().length ?? 0;
  if (length <= SUMMARY_MAX) return [];
  return [`${input.url}: summary is ${length} characters, at most ${SUMMARY_MAX}`];
}

function toArticle(input: EntryInput, icons?: Map<string, IconFiles>): Article {
  const domain = input.domain ?? "";
  const tags = input.tags ?? [];
  const article: Article = {
    id: articleId(input.url),
    title: input.title,
    url: input.url,
    // Unset or misspelled by hand both read as an article, so every card gets an icon.
    type: normalizeEntryType(input.type),
    source: input.source ?? "",
    publishedAt: toIso(input.publishedAt),
    domain,
    tags: sortTags(domain, tags),
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

/** Resolves names to indices; anything that would draw a broken map stops the build. */
function resolveEvolution(road: RoadmapInput): Evolution | undefined {
  const evolution = road.evolution;
  if (!evolution) return undefined;
  const eras = evolution.eras.map((era) => era.name);
  const ids = new Set<string>();
  const nodes = evolution.nodes.map((node) => {
    const where = `${road.id} evolution / ${node.id}`;
    if (ids.has(node.id)) throw new Error(`${where}: duplicate id`);
    ids.add(node.id);
    const era = eras.indexOf(node.era);
    const lane = evolution.lanes.indexOf(node.lane);
    if (era < 0) throw new Error(`${where}: unknown era "${node.era}"`);
    if (lane < 0) throw new Error(`${where}: unknown lane "${node.lane}"`);
    const from = node.from ?? [];
    if (!from.length && !node.problem)
      throw new Error(`${where}: a box with no source needs a problem`);
    if (from.length && node.problem)
      throw new Error(`${where}: its sources' reasons replace the problem`);
    const { id, label, year, idea, impact } = node;
    const out: EvolutionNode = { id, label, era, lane, year, idea, impact, from };
    if (node.problem) out.problem = node.problem;
    return out;
  });
  evolution.eras.forEach((era, index) => {
    if (!nodes.some((node) => node.era === index)) {
      throw new Error(`${road.id} evolution: era "${era.name}" has no boxes`);
    }
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    for (const { id } of node.from) {
      const where = `${road.id} evolution / ${node.id}`;
      const source = byId.get(id);
      if (!source) throw new Error(`${where}: unknown source "${id}"`);
      if (source.era > node.era) throw new Error(`${where}: "${id}" is in a later era`);
      if (source.year > node.year) throw new Error(`${where}: "${id}" is from a later year`);
    }
  }
  return { eras: evolution.eras, lanes: evolution.lanes, nodes };
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
    const parts = road.parts.map((part) => ({
      name: part.name,
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
    }));
    const roadmap: Roadmap = {
      id: road.id,
      title: road.title,
      before: checkTopics(road.before, `${road.id}.before`),
      next: checkTopics(road.next, `${road.id}.next`),
      parts,
    };
    const evolution = resolveEvolution(road);
    if (evolution) roadmap.evolution = evolution;
    return roadmap;
  });
}

async function main(): Promise<void> {
  const outDir = fileURLToPath(new URL("../public/", import.meta.url));
  const inputs = await readEntries();
  // All at once rather than the first: a vocabulary change usually breaks many entries together.
  const problems = [...inputs.flatMap(tagProblems), ...inputs.flatMap(summaryProblems)];
  if (problems.length)
    throw new Error(`${problems.length} entry problems:\n${problems.join("\n")}`);
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
