import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Yelp Engineering and Product Blog archive → articles + next-page link.
 *
 * engineeringblog.yelp.com is a Jekyll site (running since ~2010) with a
 * real, paginated, reverse-chronological listing at `/page/N` (`/` is page
 * 1), currently 42 pages deep, with the last page (`/page/42`) reaching back
 * to posts from October 2010.
 *
 * Selectors match the captured fixture (engineeringblog.yelp.com/page/2/):
 * - Each post is an `<article class="article-excert">`.
 * - Title + link: the `<a>` inside `h3.alternate`.
 * - Published date: `<li class="post-date">` human-readable text (e.g.
 *   "Jul 8, 2025"), which `Date.parse` handles directly — there's no
 *   machine-readable `<time>` element on this theme.
 * - No category/tag is shown on the listing (author bios only), so tags are
 *   left empty for backfilled articles.
 * - Summary: the first `<p>` inside `.post-preview` (the "Continue reading"
 *   link is a second `<p>` in the same div and is excluded by `.first()`).
 * - Thumbnail: the `<img>` in the second `.column` (`column-beta`) of the
 *   post's layout block; absent on some older posts.
 * - Next page: `<a class="... next pagination-links_anchor">`; absent on
 *   the last page (only `prev` and numbered links remain).
 */
export function parseYelpArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article.article-excert").each((_i, el) => {
    const post = $(el);
    const link = post.find("h3.alternate a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateText = post.find("li.post-date").first().text().trim();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";
    const imgSrc = post.find(".column-beta img").first().attr("src");

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "yelp",
      publishedAt,
      tags: resolveTags([], "yelp"),
      summary: summarize(post.find(".post-preview p").first().html() ?? ""),
      thumbnail: imgSrc ? new URL(imgSrc, pageUrl).toString() : null,
      fetchedAt,
    });
  });
  const next = $("a.next.pagination-links_anchor").first().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

export const yelp: Source = {
  id: "yelp",
  name: "Yelp Engineering",
  fetch: () => fetchRss("https://engineeringblog.yelp.com/feed.xml", "yelp"),
  backfill: () => crawlArchive("https://engineeringblog.yelp.com/", parseYelpArchivePage),
};
