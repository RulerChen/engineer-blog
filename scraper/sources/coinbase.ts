import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

interface RichTextNode {
  nodeType: string;
  value?: string;
  content?: RichTextNode[];
}

interface ContentfulArticle {
  slug: string;
  title: string;
  publicationDate?: string;
  content: {
    excerpt?: RichTextNode;
    thumbnail?: { defaultImage?: { url?: string } };
    tags?: { name: string }[];
  };
}

interface BridgeEntry {
  key: string;
  data?: { articles?: { total: number; items: ContentfulArticle[] } };
}

/** Flattens a Contentful rich-text document into plain text (paragraphs joined by spaces). */
function extractText(node: RichTextNode | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.content ?? []).map(extractText).join(" ");
}

/**
 * Coinbase Engineering blog archive → articles (no further pagination reachable).
 *
 * `medium.com/coinbase-engineering` — the publication named in the task — is
 * dormant: its RSS feed (`medium.com/feed/coinbase-engineering`) parses fine
 * but returns zero `<item>`s, and the publication's own page has no
 * server-rendered article list (Medium renders it client-side via JS/GraphQL
 * after load), so there's nothing to scrape or subscribe to there. The
 * *active* Coinbase engineering content as of mid-2026 instead lives on
 * `www.coinbase.com/blog`, tagged "Engineering" and surfaced at
 * `/blog/landing/engineering`.
 *
 * That page has no RSS feed and no `<time>`/date markup in its static HTML —
 * it's a Next.js app — but the initial server render embeds the full article
 * list (title, slug, ISO `publicationDate`, rich-text excerpt, thumbnail,
 * tags) as JSON inside `<script id="server-app-state" type="application/json">`,
 * under `JSON.parse(state.suspenseBridgeData)[…].data.articles`. That embedded
 * list already carries a real per-article date, so no separate feed is
 * needed.
 *
 * The listing reports `articles.total: 156`, but only the first page's worth
 * (20 items, reaching back to 2025-12-11 as of this writing) is reachable:
 * `?page=2`/`?offset=20` query params are silently ignored (the server always
 * renders the same first 20), and path-based variants like
 * `/blog/landing/engineering/page/2` are blocked with HTTP 403 by the site's
 * WAF. There is no discovered way to fetch older pages, so `nextUrl` is
 * always `null` and `fetch`/`backfill` both crawl this single page.
 */
export function parseCoinbaseArchivePage(html: string, pageUrl: string): ArchivePage {
  const fetchedAt = new Date().toISOString();
  const stateMatch = html.match(
    /<script id="server-app-state" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!stateMatch) return { articles: [], nextUrl: null };

  const state = JSON.parse(stateMatch[1]) as { suspenseBridgeData: string };
  const bridge = JSON.parse(state.suspenseBridgeData) as BridgeEntry[];
  const items = bridge.find((entry) => entry.data?.articles)?.data?.articles?.items ?? [];

  const articles: Article[] = items
    .filter((item) => item.slug && item.title)
    .map((item) => {
      const absolute = new URL(item.slug, pageUrl).toString();
      const publishedAt =
        item.publicationDate && !Number.isNaN(Date.parse(item.publicationDate))
          ? new Date(item.publicationDate).toISOString()
          : "";
      const thumbnailUrl = item.content.thumbnail?.defaultImage?.url;
      const thumbnail = thumbnailUrl
        ? thumbnailUrl.startsWith("//")
          ? `https:${thumbnailUrl}`
          : thumbnailUrl
        : null;

      return {
        id: articleId(absolute),
        title: item.title.trim(),
        url: normalizeUrl(absolute),
        source: "coinbase",
        publishedAt,
        tags: resolveTags(
          (item.content.tags ?? []).map((tag) => tag.name),
          "coinbase",
        ),
        summary: summarize(extractText(item.content.excerpt)),
        thumbnail,
        fetchedAt,
      };
    });

  return { articles, nextUrl: null };
}

export const coinbase: Source = {
  id: "coinbase",
  name: "Coinbase Engineering",
  fetch: () =>
    crawlArchive("https://www.coinbase.com/blog/landing/engineering", parseCoinbaseArchivePage, {
      maxPages: 1,
    }),
  backfill: () =>
    crawlArchive("https://www.coinbase.com/blog/landing/engineering", parseCoinbaseArchivePage),
};
