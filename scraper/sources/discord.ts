import * as cheerio from "cheerio";
import type { ArchivePage, CrawlOpts } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { USER_AGENT } from "../src/http.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

const CATEGORY_URL = "https://discord.com/category/engineering";

/**
 * Discord Blog "Engineering" category listing → articles (no dates yet) +
 * next-page link.
 *
 * `discord.com/blog/rss.xml` is a real feed with genuine per-item `<pubDate>`
 * values, but it's the whole Discord blog (patch notes, community stories,
 * safety, company news, ...) with no `<category>` element on any item, so it
 * can't be filtered to engineering content on its own.
 * `discord.com/category/engineering` *is* engineering-scoped (verified: every
 * one of its 81 cards falls under the "Engineering & Developers" label), but
 * it carries no date anywhere in its markup — its "Load More" button is a
 * pure client-side reveal of `<div class="hide">` cards that are already all
 * present in the initial HTML (confirmed via the page's inline script), so
 * the whole 81-post archive is really a single unpaginated response; this
 * parser always returns `nextUrl: null`.
 *
 * Selectors match the captured fixture (discord.com/category/engineering):
 * - The one hero post is `<a class="featured_main-card ...">`; every other
 *   post is `<a class="cms_article ...">` — both are handled by one combined
 *   selector since they share the same fields (just different templates).
 * - Title: `.text-style-3lines` (grid cards) or `h2.ts_h2` (the featured
 *   card); falls back to the `aria-label` attribute, which also holds the
 *   exact title on both templates.
 * - Category/tag: `.blog_category-text` (e.g. "Engineering & Developers").
 * - Thumbnail: the card's first `<img>` `src`.
 * - Summary: only the featured card has one, in `p.body-regular`; grid cards
 *   show no snippet at all, so `summary` is left empty for those.
 * - Published date: not available on this page at all — left as `""` here,
 *   filled in by `fetchDiscordArchive` below from each post's own page (same
 *   two-phase approach as Notion's `/blog/topic/tech` listing).
 */
export function parseDiscordCategoryPage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("a.cms_article, a.featured_main-card").each((_i, el) => {
    const card = $(el);
    const href = card.attr("href");
    const title =
      card.find(".text-style-3lines").first().text().trim() ||
      card.find("h2.ts_h2").first().text().trim() ||
      card.attr("aria-label")?.trim() ||
      "";
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const category = card.find(".blog_category-text").first().text().trim();
    const summary = card.find("p.body-regular").first().text().trim();

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "discord",
      publishedAt: "", // not available on the listing page; filled in by fetchDiscordArchive
      tags: resolveTags(category ? [category] : [], "discord"),
      summary: summarize(summary),
      fetchedAt,
    });
  });
  const nextUrl = null; // single unpaginated listing (see module docs)
  return { articles, nextUrl };
}

/**
 * Extracts `datePublished` from a Discord post page's `BlogPosting` JSON-LD
 * block (e.g. `<script type="application/ld+json">{"@type":"BlogPosting",
 * "datePublished":"Jun 30, 2026", ...}</script>`), which `Date.parse` handles
 * directly.
 */
export function extractDiscordPublishedAt(html: string): string {
  const $ = cheerio.load(html);
  let publishedAt = "";
  $('script[type="application/ld+json"]').each((_i, el) => {
    if (publishedAt) return;
    try {
      const data: unknown = JSON.parse($(el).contents().text());
      if (
        data &&
        typeof data === "object" &&
        (data as Record<string, unknown>)["@type"] === "BlogPosting"
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
 * Crawls the Discord "Engineering" category listing, then enriches each post
 * with its real publish date by fetching the post page itself (see module
 * docs). Requests are sequential with a polite delay, mirroring `crawlArchive`.
 * Used for `backfill`, where hitting all ~81 post pages once is acceptable.
 */
async function fetchDiscordArchive(opts: CrawlOpts = {}): Promise<Article[]> {
  const { delayMs = 1500, fetchImpl = fetch } = opts;
  const listed = await crawlArchive(CATEGORY_URL, parseDiscordCategoryPage, opts);
  const enriched: Article[] = [];
  for (let i = 0; i < listed.length; i++) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const article = listed[i];
    try {
      const res = await fetchImpl(article.url, { headers: { "user-agent": USER_AGENT } });
      if (!res.ok) continue;
      const publishedAt = extractDiscordPublishedAt(await res.text());
      if (publishedAt) enriched.push({ ...article, publishedAt });
    } catch {
      // skip posts whose detail page fails to fetch or parse
    }
  }
  return enriched;
}

/**
 * Daily fetch: refetching all ~81 post pages every day (as `backfill` does)
 * would be wasteful for a strategy that only needs to notice new posts. The
 * whole-blog RSS feed already carries a real per-item `pubDate` for every
 * post, so `fetch` instead reuses that feed and cross-references it against
 * the engineering category listing (one extra request) to keep only posts
 * that are actually engineering content, retagging them from the category
 * label since the RSS feed has no `<category>` of its own.
 */
async function fetchDiscordDaily(fetchImpl: typeof fetch = fetch): Promise<Article[]> {
  const [rssArticles, catRes] = await Promise.all([
    fetchRss("https://discord.com/blog/rss.xml", "discord", fetchImpl),
    fetchImpl(CATEGORY_URL, { headers: { "user-agent": USER_AGENT } }),
  ]);
  if (!catRes.ok) throw new Error(`${CATEGORY_URL}: HTTP ${catRes.status}`);
  const { articles: stubs } = parseDiscordCategoryPage(await catRes.text(), CATEGORY_URL);
  const engineering = new Map(stubs.map((stub) => [stub.url, stub.tags]));
  return rssArticles
    .filter((article) => engineering.has(article.url))
    .map((article) => ({ ...article, tags: engineering.get(article.url) ?? article.tags }));
}

export const discord: Source = {
  id: "discord",
  name: "Discord Engineering",
  fetch: () => fetchDiscordDaily(),
  backfill: () => fetchDiscordArchive(),
};
