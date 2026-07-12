import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Stripe Blog "Engineering" category archive → articles + next-page link.
 *
 * `stripe.com/blog/feed.rss` is a real, dated RSS feed, but it's the
 * *general* company blog (product launches, growth data, events) — it isn't
 * scoped to engineering, and the `?category=engineering` query some CMS
 * feeds honor is silently ignored here (byte-identical output with or
 * without it). `stripe.com/blog/engineering` itself, however, is a real
 * server-rendered, paginated, chronological listing scoped to the
 * engineering category, with a publish date on every card — that page is
 * what this parser and its fixture target. (A plain `curl` without full
 * browser-like `Accept`/`Accept-Language` headers gets served a shell page
 * with no post markup; a normal browser User-Agent plus those headers gets
 * the real server-rendered HTML.)
 *
 * Currently 3 pages deep, reaching back to a post dated June 13, 2012.
 *
 * Selectors match the captured fixture (stripe.com/blog/engineering):
 * - Each post is an `<article class="BlogIndexPost ...">`.
 * - Title link: `a.BlogIndexPost__titleLink` (already an absolute URL).
 * - Published date: `<time class="BlogPostDate ..." datetime="ISO">`.
 * - Category: `a.BlogCategoryLink` text (always "Engineering" on this page,
 *   but extracted rather than hardcoded).
 * - Summary: the first `<p>` inside `.BlogIndexPost__body`.
 * - Thumbnail: `img.BlogImageCard__image` — its `src` is rendered with
 *   leading/trailing whitespace in the source HTML, so it's trimmed.
 * - Next page: `a.BlogCategoryPagination__directionLink` — the same class
 *   is used for both "Prev" and "Next", disambiguated by link text.
 */
export function parseStripeArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article.BlogIndexPost").each((_i, el) => {
    const post = $(el);
    const titleLink = post.find("a.BlogIndexPost__titleLink").first();
    const href = titleLink.attr("href");
    const title = titleLink.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateAttr = post.find("time.BlogPostDate").first().attr("datetime") ?? "";
    const publishedAt =
      dateAttr && !Number.isNaN(Date.parse(dateAttr)) ? new Date(dateAttr).toISOString() : "";
    const category = post.find("a.BlogCategoryLink").first().text().trim();

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "stripe",
      publishedAt,
      tags: resolveTags(category ? [category] : [], "stripe"),
      summary: summarize(post.find(".BlogIndexPost__body p").first().html() ?? ""),
      fetchedAt,
    });
  });
  const next = $("a.BlogCategoryPagination__directionLink")
    .filter((_i, el) => $(el).text().trim() === "Next")
    .first()
    .attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

/**
 * The general-blog RSS feed isn't scoped to engineering (see above), so
 * `fetch` reuses the same archive parser as `backfill`, capped to the first
 * page, matching the pattern used for Uber/Google when a source's real feed
 * doesn't serve the right content.
 */
export const stripe: Source = {
  id: "stripe",
  name: "Stripe Engineering",
  fetch: () =>
    crawlArchive("https://stripe.com/blog/engineering", parseStripeArchivePage, { maxPages: 1 }),
  backfill: () => crawlArchive("https://stripe.com/blog/engineering", parseStripeArchivePage),
};
