import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

interface AnthropicPost {
  _type?: string;
  cardPhoto?: { url?: string } | null;
  publishedOn?: string;
  slug?: { current?: string };
  subjects?: { label?: string }[];
  summary?: string | null;
  title?: string;
}

/**
 * Concatenates every React Server Components streaming chunk
 * (`self.__next_f.push([1, "<json-string>"])`) found in the page's `<script>`
 * tags into one decoded text blob. Each pushed argument is itself a valid
 * JSON string; `JSON.parse`-ing it recovers the real (unescaped) payload
 * text, inside which the page's Sanity CMS data — including every post
 * record — appears as literal, well-formed JSON.
 */
function extractFlightText(html: string): string {
  const $ = cheerio.load(html);
  let combined = "";
  $("script").each((_i, el) => {
    const text = $(el).contents().text();
    const match = text.match(/self\.__next_f\.push\(\[1,(".*")\]\)/s);
    if (!match) return;
    try {
      combined += JSON.parse(match[1]) as string;
    } catch {
      // not a valid JSON string chunk — skip
    }
  });
  return combined;
}

/**
 * Finds the `{...}` object starting at `startIdx`, tracking quoted strings
 * and backslash escapes so that a post's `title`/`summary` text containing
 * literal `{`, `}`, or `"` characters doesn't truncate the match early (a
 * plain non-greedy regex like `\{.*?\}` breaks on those).
 */
function extractBalancedObject(text: string, startIdx: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Anthropic Newsroom archive → articles + next-page link.
 *
 * anthropic.com has no RSS feed anywhere: `/news/rss.xml`, `/rss.xml`,
 * `/feed`, `/feed.xml`, `/news/feed`, and `/news.rss` all resolve to the
 * site's generic 404 page, and `/news`'s `<head>` advertises no
 * `<link rel="alternate" type="application/rss+xml">` either.
 *
 * `/news` is a Next.js App Router page whose static HTML shell has no post
 * data in the DOM — but the page ships its data via React Server Components
 * streaming: several `<script>` tags each call
 * `self.__next_f.push([1, "<json-string>"])`, and decoding + concatenating
 * those JSON-string arguments recovers literal Sanity CMS JSON, including one
 * `{"_type":"post", ...}` object per article (`slug`, `title`, `summary`,
 * `publishedOn`, `subjects` (tags)). Verified:
 * this single response already embeds the *entire* news archive — 253 unique
 * posts (deduped by slug/URL below; the same post can appear more than once,
 * e.g. once in a "featured" section and again in a "related posts" list)
 * spanning 2021-05-28 through the capture date, with no "load more" button,
 * `hasMore`/pagination field, or `/api/` reference anywhere in the decoded
 * payload — so `nextUrl` is always `null`.
 */
export function parseAnthropicArchivePage(html: string, pageUrl: string): ArchivePage {
  const flightText = extractFlightText(html);
  const fetchedAt = new Date().toISOString();
  const seen = new Set<string>();
  const articles: Article[] = [];

  const marker = '{"_type":"post"';
  let idx = flightText.indexOf(marker);
  while (idx !== -1) {
    const raw = extractBalancedObject(flightText, idx);
    if (!raw) break;
    idx = flightText.indexOf(marker, idx + raw.length);

    try {
      const post = JSON.parse(raw) as AnthropicPost;
      const slug = post.slug?.current;
      if (!slug || !post.title) continue;

      const absolute = new URL(`/news/${slug}`, pageUrl).toString();
      if (seen.has(absolute)) continue;
      seen.add(absolute);

      const publishedAt =
        post.publishedOn && !Number.isNaN(Date.parse(post.publishedOn))
          ? new Date(post.publishedOn).toISOString()
          : "";

      articles.push({
        id: articleId(absolute),
        title: post.title.trim(),
        url: normalizeUrl(absolute),
        source: "anthropic",
        publishedAt,
        tags: resolveTags(
          (post.subjects ?? []).map((subject) => subject.label ?? "").filter(Boolean),
          "anthropic",
        ),
        summary: summarize(post.summary ?? ""),
        fetchedAt,
      });
    } catch {
      // not a well-formed post object — skip
    }
  }

  return { articles, nextUrl: null };
}

export const anthropic: Source = {
  id: "anthropic",
  name: "Anthropic",
  fetch: () =>
    crawlArchive("https://www.anthropic.com/news", parseAnthropicArchivePage, { maxPages: 1 }),
  backfill: () => crawlArchive("https://www.anthropic.com/news", parseAnthropicArchivePage),
};
