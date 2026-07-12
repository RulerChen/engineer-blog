import Parser from "rss-parser";
import { USER_AGENT } from "./http.js";
import { articleId, normalizeUrl } from "./normalize.js";
import { summarize } from "./sanitize.js";
import { resolveTags } from "./tags.js";
import type { Article } from "./types.js";

const parser = new Parser();

/** Parse RSS/Atom XML into normalized Articles. Items without a link are skipped. */
export async function parseFeed(
  xml: string,
  sourceId: string,
  now = new Date(),
): Promise<Article[]> {
  const feed = await parser.parseString(xml);
  const fetchedAt = now.toISOString();
  const articles: Article[] = [];
  for (const item of feed.items) {
    if (!item.link) continue;
    articles.push({
      id: articleId(item.link),
      title: (item.title ?? "").trim(),
      url: normalizeUrl(item.link),
      source: sourceId,
      publishedAt: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : ""),
      tags: resolveTags(item.categories ?? [], sourceId),
      summary: summarize(item.content ?? item.contentSnippet ?? ""),
      fetchedAt,
    });
  }
  return articles;
}

/** Generic daily fetcher: takes a feed URL and source id, returns normalized Articles. */
export async function fetchRss(
  feedUrl: string,
  sourceId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Article[]> {
  const res = await fetchImpl(feedUrl, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${feedUrl}: HTTP ${res.status}`);
  return parseFeed(await res.text(), sourceId);
}
