import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * LinkedIn Engineering blog listing → articles + next-page link.
 *
 * `engineering.linkedin.com/blog.rss.html` (and every other `/rss`,
 * `/feed`, `/blog/rss.xml` variant tried) 404s — LinkedIn's engineering blog
 * has no RSS feed at all, and there's no sitemap.xml either (AEM instance
 * returns a 404 resource-not-found page for both).
 *
 * `engineering.linkedin.com/blog` is a real server-rendered listing, but it
 * is not paginated (`?page=2`/`?page=3` return byte-identical HTML) and only
 * ever shows one hero "featured" post plus a fixed grid of 6 more — so this
 * is used for `fetch` only, with no `backfill`. The topic pages
 * (`/blog/topic/...`) looked promising for a deeper archive, but their post
 * listings are client-side rendered (nothing but topic-filter chrome is
 * present in the raw HTML), so they can't be scraped without a browser.
 *
 * Selectors match the captured fixture (engineering.linkedin.com/blog):
 * - Each grid post is an `<li class="post-list__item grid-post">`. The
 *   hero/featured post at the top (`.featured-post`) has no date at all
 *   (`.featured-post__author--no-date`), so it's deliberately excluded —
 *   `articleErrors` requires a parseable `publishedAt`.
 * - Title + URL: `a.grid-post__link` (site-truncated with a trailing
 *   "..." for long titles — that's the actual rendered text, not an
 *   artifact of this parser).
 * - Published date: `p.grid-post__date`, formatted as "MMM D, YYYY" (e.g.
 *   "Jun 18, 2026"), which `Date.parse` handles directly.
 * - Category/tag: `p.grid-post__topic a`.
 * - Thumbnail: the post image is lazy-loaded, so the real URL is in
 *   `img.post__image`'s `data-delayed-url` attribute, not `src`.
 * - No excerpt/summary text is present on this listing, so it's left empty.
 */
export function parseLinkedinArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("li.post-list__item.grid-post").each((_i, el) => {
    const post = $(el);
    const link = post.find("a.grid-post__link").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateText = post.find("p.grid-post__date").first().text().trim();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";
    const category = post.find("p.grid-post__topic a").first().text().trim();

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "linkedin",
      publishedAt,
      tags: resolveTags(category ? [category] : [], "linkedin"),
      summary: summarize(""),
      fetchedAt,
    });
  });
  return { articles, nextUrl: null };
}

export const linkedin: Source = {
  id: "linkedin",
  name: "LinkedIn Engineering",
  fetch: () =>
    crawlArchive("https://engineering.linkedin.com/blog", parseLinkedinArchivePage, {
      maxPages: 1,
    }),
};
