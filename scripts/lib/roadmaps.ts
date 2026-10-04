import { type Article, normalizeEntryType } from "../../src/shared/entry.js";
import type {
  Evolution,
  EvolutionNode,
  Roadmap,
  RoadmapInput,
  RoadmapItem,
  RoadmapItemInput,
  RoadmapLink,
} from "../../src/shared/roadmap.js";
import { topicLabel } from "../../src/shared/topicMap.js";
import { iconFields, normalizeUrl } from "./articles.js";
import type { IconFiles } from "./read.js";

/** Fills an item from the entry with its url; an unknown url with no title is a typo and stops the build. */
function resolveItem(
  input: RoadmapItemInput,
  byUrl: Map<string, Article>,
  icons: Map<string, IconFiles>,
  where: string,
): RoadmapItem {
  const entry = byUrl.get(normalizeUrl(input.url));
  if (!entry && !input.title)
    throw new Error(`${where}: ${input.url} is not on the list and has no title`);
  const item: RoadmapItem = entry
    ? {
        url: entry.url,
        type: entry.type,
        title: entry.title,
        source: entry.source,
        year: entry.publishedAt.slice(0, 4),
        ...iconFields(entry.source, icons),
      }
    : {
        url: input.url,
        type: normalizeEntryType(input.type),
        title: input.title!,
        ...(input.source ? { source: input.source } : {}),
        ...(input.year ? { year: input.year } : {}),
        ...iconFields(input.source, icons),
      };
  if (input.scope) item.scope = input.scope;
  if (input.why) item.why = input.why;
  if (input.links?.length) item.links = checkLinks(input.links, item.url, where);
  return item;
}

/** A link with no label draws an empty chip, and one repeating another url adds nothing. */
function checkLinks(links: RoadmapLink[], url: string, where: string): RoadmapLink[] {
  const seen = new Set([normalizeUrl(url)]);
  for (const link of links) {
    if (!link.label || !link.url) throw new Error(`${where}: a link needs a label and a url`);
    if (seen.has(normalizeUrl(link.url))) throw new Error(`${where}: ${link.url} is linked twice`);
    seen.add(normalizeUrl(link.url));
  }
  return links;
}

/** A relation that names no known topic would render as a blank chip. */
function checkTopics(ids: string[], where: string): string[] {
  for (const id of ids) {
    if (!topicLabel(id)) throw new Error(`${where}: unknown topic "${id}"`);
  }
  return ids;
}

/** Resolves era and lane names to indices; anything that would draw a broken map stops the build. */
function resolveEvolution(road: RoadmapInput): Evolution | undefined {
  const evolution = road.evolution;
  if (!evolution) return undefined;
  const eras = evolution.eras.map((era) => era.name);
  const ids = new Set<string>();
  const nodes = evolution.nodes.map((node): EvolutionNode => {
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
    const { id, label, year, idea, impact, problem } = node;
    return { id, label, era, lane, year, idea, impact, from, ...(problem ? { problem } : {}) };
  });
  evolution.eras.forEach((era, index) => {
    if (!nodes.some((node) => node.era === index)) {
      throw new Error(`${road.id} evolution: era "${era.name}" has no boxes`);
    }
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    const where = `${road.id} evolution / ${node.id}`;
    for (const { id } of node.from) {
      const source = byId.get(id);
      if (!source) throw new Error(`${where}: unknown source "${id}"`);
      if (source.era > node.era) throw new Error(`${where}: "${id}" is in a later era`);
      if (source.year > node.year) throw new Error(`${where}: "${id}" is from a later year`);
    }
  }
  return { eras: evolution.eras, lanes: evolution.lanes, nodes };
}

/** Every item resolved against the entries, papers included. */
export function buildRoadmaps(
  inputs: RoadmapInput[],
  entries: Article[],
  icons: Map<string, IconFiles>,
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
    const evolution = resolveEvolution(road);
    return {
      id: road.id,
      title: road.title,
      before: checkTopics(road.before, `${road.id}.before`),
      next: checkTopics(road.next, `${road.id}.next`),
      parts,
      ...(evolution ? { evolution } : {}),
    };
  });
}
