import * as cheerio from "cheerio";
import type { ArchivePage, CrawlOpts } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { USER_AGENT } from "../src/http.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Notion Blog "Tech" topic archive → articles + next-page link.
 *
 * notion.so has no RSS feed at all: `/blog/rss.xml`, `/blog/feed`, and
 * `/blog/topic/tech/rss.xml` all resolve to the site's generic 404 page.
 * The blog does expose a real, paginated, engineering-focused topic listing
 * at `/blog/topic/tech` (title "Tech": "How we're building Notion, block by
 * block."), currently 3 pages / ~24 posts deep. That listing page, however,
 * carries no publish date anywhere in its markup or embedded `__NEXT_DATA__`
 * JSON for any post — not a parsing gap, there simply is no date field on
 * the topic-listing card. Each individual post page *does* carry a real date,
 * in a `<script type="application/ld+json">` block with `"@type":"Article"`
 * and a `datePublished` field (also mirrored in a `<time datetime>` element).
 *
 * So, unlike the other sources, this can't be reduced to one `parsePage`
 * call per archive page: `fetchNotionArticles` below first crawls the topic
 * listing (via `crawlArchive` + `parseNotionListingPage`) to collect
 * title/url/summary, then makes one additional, sequential,
 * delayed request per post to read its real publish date from the JSON-LD
 * block. Posts whose date can't be resolved are dropped (mirrors
 * `filterValid`'s date requirement downstream).
 *
 * Selectors match the captured fixture (notion.so/blog/topic/tech):
 * - Each post is an `<article class="post-preview">`.
 * - Title + link: the card's outer `<a title="…">` wrapper (its `title`
 *   attribute holds the exact post title; the visible `<h3>` text is
 *   identical but requires a hashed CSS-module class to select).
 * - Summary: `a[class^="postPreview_subtitle"]` — the hash suffix on this
 *   class changes per build, so only the stable prefix is matched.
 * - Next page: `<nav aria-label="Pagination">`, whose "Next page" link's
 *   parent `<li>` carries a `hidden` attribute on the last page.
 */
export function parseNotionListingPage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article.post-preview").each((_i, el) => {
    const post = $(el);
    const link = post.find("a[title]").first();
    const href = link.attr("href");
    const title = link.attr("title")?.trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const summary = post.find('a[class^="postPreview_subtitle"]').first().text().trim();

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "notion",
      publishedAt: "", // not available on the listing page; filled in by fetchNotionArticles
      tags: resolveTags([], "notion", `${title} ${summary}`),
      summary: summarize(summary),
      fetchedAt,
    });
  });
  const next = $('nav[aria-label="Pagination"] li:not([hidden]) a[aria-label="Next page"]')
    .first()
    .attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

/** Extracts `datePublished` from a Notion post page's `Article` JSON-LD block. */
export function extractNotionPublishedAt(html: string): string {
  const $ = cheerio.load(html);
  let publishedAt = "";
  $('script[type="application/ld+json"]').each((_i, el) => {
    if (publishedAt) return;
    try {
      const data: unknown = JSON.parse($(el).contents().text());
      if (
        data &&
        typeof data === "object" &&
        (data as Record<string, unknown>)["@type"] === "Article"
      ) {
        const datePublished = (data as Record<string, unknown>).datePublished;
        if (typeof datePublished === "string" && !Number.isNaN(Date.parse(datePublished))) {
          publishedAt = new Date(datePublished).toISOString();
        }
      }
    } catch {
      // not JSON, or not the block we want — skip
    }
  });
  return publishedAt;
}

/**
 * Crawls the Notion "Tech" topic listing, then enriches each post with its
 * real publish date by fetching the post page itself (see module docs).
 * Requests are sequential with a polite delay, mirroring `crawlArchive`.
 */
async function fetchNotionArticles(startUrl: string, opts: CrawlOpts = {}): Promise<Article[]> {
  const { delayMs = 1500, fetchImpl = fetch } = opts;
  const listed = await crawlArchive(startUrl, parseNotionListingPage, opts);
  const enriched: Article[] = [];
  for (let i = 0; i < listed.length; i++) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const article = listed[i];
    try {
      const res = await fetchImpl(article.url, { headers: { "user-agent": USER_AGENT } });
      if (!res.ok) continue;
      const publishedAt = extractNotionPublishedAt(await res.text());
      if (publishedAt) enriched.push({ ...article, publishedAt });
    } catch {
      // skip posts whose detail page fails to fetch or parse
    }
  }
  return enriched;
}

export const notion: Source = {
  id: "notion",
  name: "Notion Engineering",
  fetch: () => fetchNotionArticles("https://www.notion.so/blog/topic/tech", { maxPages: 1 }),
  backfill: () => fetchNotionArticles("https://www.notion.so/blog/topic/tech"),
};
