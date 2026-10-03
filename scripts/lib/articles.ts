import { createHash } from "node:crypto";
import {
  type Article,
  type EntryInput,
  type EntryType,
  normalizeEntryType,
} from "../../src/shared/entry.js";
import { iconKey } from "../../src/shared/icon.js";
import { sortTags } from "../../src/shared/tags.js";
import type { IconFiles } from "./read.js";

/** Papers are reached only through roadmaps; icons, the README strip and articles.json cover blogs alone. */
export function isBlogEntry(entry: { type?: EntryType }): boolean {
  return normalizeEntryType(entry.type) !== "paper";
}

/** Lowercase host, no fragment, no trailing slash; the query is kept. */
export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.host = url.host.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/"))
    url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}

function articleId(url: string): string {
  return createHash("sha1").update(normalizeUrl(url)).digest("hex");
}

/** A bare YYYY-MM-DD is UTC midnight; anything else passes through. */
function toIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
}

/** The icon fields for a source, left off entirely when it has none. */
export function iconFields(
  source: string | undefined,
  icons: Map<string, IconFiles>,
): { icon?: string; iconDark?: string } {
  const key = iconKey(source);
  const files = key ? icons.get(key) : undefined;
  if (!files) return {};
  return files.dark ? { icon: files.light, iconDark: files.dark } : { icon: files.light };
}

function toArticle(input: EntryInput, icons: Map<string, IconFiles>): Article {
  const domain = input.domain ?? "";
  const summary = input.summary?.trim();
  return {
    id: articleId(input.url),
    title: input.title,
    url: input.url,
    type: normalizeEntryType(input.type),
    source: input.source ?? "",
    publishedAt: toIso(input.publishedAt),
    domain,
    tags: sortTags(domain, input.tags ?? []),
    ...(summary ? { summary } : {}),
    ...(input.series ? { series: input.series } : {}),
    ...(input.commentary?.length ? { commentary: input.commentary } : {}),
    ...iconFields(input.source, icons),
  };
}

/** Newest first, the order the list renders in; a later duplicate of a url replaces the earlier one. */
export function buildArticles(inputs: EntryInput[], icons: Map<string, IconFiles>): Article[] {
  const byId = new Map<string, Article>();
  for (const input of inputs) {
    const article = toArticle(input, icons);
    byId.set(article.id, article);
  }
  return [...byId.values()].toSorted(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
