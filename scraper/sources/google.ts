import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import type { Article, Source } from "../src/types.js";

/**
 * Google Developers blog archive → articles + next-page link.
 *
 * The blog's homepage (developers.googleblog.com/) is a curated set of
 * carousels (featured articles, per-topic carousels) with no pagination and
 * no dates on most cards, so it cannot serve as a backfill source. The site
 * does, however, expose a real server-rendered, paginated, chronological
 * listing at `/search/` (`?page=N`) that includes a publish date on every
 * card — that page is what this parser and its fixture target.
 *
 * Selectors match the captured fixture (developers.googleblog.com/search/):
 * - Each post is an `<li class="search-result">`.
 * - The title link is the `<a>` inside `.search-result__title`.
 * - Published date + category share a single `<p class="search-result__eyebrow">`
 *   formatted as "MONTH DAY, YEAR / Category" (e.g. "JULY 9, 2026 / Web").
 *   The date portion (before the `/`) parses fine via `Date.parse`; the
 *   category portion (after the `/`) is used as the sole tag.
 * - Next page: a `<a aria-label="Next">` inside `.nav-buttons__right`; on the
 *   last page the equivalent "Previous"-style disabled link has `href="None"`,
 *   so an `href="None"` is treated as no next page.
 */
export function parseGoogleArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("li.search-result").each((_i, el) => {
    const post = $(el);
    const link = post.find(".search-result__title a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const eyebrow = post.find(".search-result__eyebrow").first().text().trim();
    const [datePart, tagPart] = eyebrow.split("/").map((part) => part.trim());
    const publishedAt =
      datePart && !Number.isNaN(Date.parse(datePart)) ? new Date(datePart).toISOString() : "";

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "google",
      publishedAt,
      tags: tagPart ? [tagPart] : [],
      summary: summarize(post.find(".search-result__summary").first().html() ?? ""),
      thumbnail: post.find("img.search-result__featured-img").first().attr("src") ?? null,
      fetchedAt,
    });
  });
  const next = $(".nav-buttons__right a[aria-label='Next']").first().attr("href");
  const nextUrl = next && next !== "None" ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

export const google: Source = {
  id: "google",
  name: "Google Developers",
  fetch: () => fetchRss("https://developers.googleblog.com/feeds/posts/default?alt=rss", "google"),
  backfill: () => crawlArchive("https://developers.googleblog.com/search/", parseGoogleArchivePage),
};
