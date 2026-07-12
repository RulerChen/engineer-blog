import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Shopify Engineering blog archive → articles + next-page link.
 *
 * shopify.engineering has no RSS feed at all: `/rss.xml`, `/feed`, `/feed.xml`,
 * `/atom.xml`, and `/articles.rss` all resolve to the site's generic 404 page.
 * The blog does expose a real, paginated, reverse-chronological listing at
 * `/latest` (`?page=N`), currently 22 pages deep, with the last page
 * (`?page=22`) reaching back to a post dated Oct 15, 2010 — far beyond any
 * realistic backfill target.
 *
 * Selectors match the captured fixture (shopify.engineering/latest?page=2):
 * - Each post is an `<article class="article--index ...">`.
 * - Title + link: the `<a>` inside the `.blogPost` wrapper (the same href
 *   also wraps the card's `<img>`, so the title link is matched specifically
 *   to avoid picking up the image-only anchor, which has no text).
 * - Published date: the only date on the card is human-readable text in the
 *   `<p class="richtext ... text-engineering-dark-author-text ...">`
 *   immediately after the title (e.g. "Aug 5, 2025") — no `<time>` element
 *   anywhere on this theme. `Date.parse` handles the format directly.
 * - No topic/tag or summary snippet is shown on this listing (topics only
 *   appear as separate nav links elsewhere on the page), so both are left
 *   empty for backfilled articles, mirroring Dropbox's `/all-stories` case.
 * - Thumbnail: the card's `<img>` `src` (a Shopify CDN URL with query-string
 *   sizing params, kept as-is).
 * - Next page: an `<a aria-label="External source:  Next ">` link with an
 *   `?page=N` href; it is absent entirely on the last page (no disabled/dead
 *   placeholder to filter out, unlike Google's `href="None"` case).
 */
export function parseShopifyArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article.article--index").each((_i, el) => {
    const post = $(el);
    const link = post.find(".blogPost a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateText = post
      .find("p.richtext.text-engineering-dark-author-text")
      .first()
      .text()
      .trim();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "shopify",
      publishedAt,
      tags: resolveTags([], "shopify"),
      summary: summarize(""),
      fetchedAt,
    });
  });
  const next = $('a[aria-label="External source:  Next "]').first().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

export const shopify: Source = {
  id: "shopify",
  name: "Shopify Engineering",
  fetch: () =>
    crawlArchive("https://shopify.engineering/latest", parseShopifyArchivePage, { maxPages: 1 }),
  backfill: () => crawlArchive("https://shopify.engineering/latest", parseShopifyArchivePage),
};
