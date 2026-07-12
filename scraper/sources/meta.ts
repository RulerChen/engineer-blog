import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * WordPress archive page → articles + next-page link.
 *
 * Selectors match the captured fixture (engineering.fb.com/page/2/):
 * - Each post is an `<article>` element (no shared class across all posts —
 *   the featured/hero post and the grid posts use different class lists).
 * - The title link is the `<a>` inside `.entry-title` (falls back to the
 *   first non-image link in the article for the featured post, which has
 *   no `.entry-title` wrapper).
 * - Published date: the fixture's `<time datetime="APR 16, 2026">` uses a
 *   human-readable (not ISO) datetime value, and the featured/hero post at
 *   the top of the page has no `<time>` element at all. Both posts' URLs
 *   embed the publish date as `/YYYY/MM/DD/`, so that is used as the
 *   primary source of truth, falling back to the `<time>` text when a URL
 *   doesn't match.
 * - Category links: `<a rel="category tag" ...>`, matched via `[rel~="category"]`.
 * - Next page: the fixture has no in-body pagination nav (no `.page-numbers`
 *   or `a[rel="next"]`); the only next-page reference is `<link rel="next">`
 *   in the document `<head>`, which cheerio parses along with the rest of
 *   the document.
 */
export function parseMetaArchivePage(html: string, _pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article").each((_i, el) => {
    const post = $(el);
    const link = post.find(".entry-title a").first();
    const href = (link.length ? link : post.find("a").first()).attr("href");
    const title = (link.length ? link : post.find("a").first()).text().trim();
    if (!href || !title) return;

    const urlDateMatch = href.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    const timeText = post.find("time[datetime]").first().text().trim();
    const publishedAt = urlDateMatch
      ? new Date(
          `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}T00:00:00.000Z`,
        ).toISOString()
      : timeText
        ? new Date(timeText).toISOString()
        : "";

    const summary = summarize(post.find(".entry-content, .entry-summary, p").first().html() ?? "");
    articles.push({
      id: articleId(href),
      title,
      url: normalizeUrl(href),
      source: "meta",
      publishedAt,
      tags: resolveTags(
        post
          .find('a[rel~="category"]')
          .map((_j, tag) => $(tag).text().trim())
          .get()
          .filter(Boolean),
        "meta",
        `${title} ${summary}`,
      ),
      summary,
      fetchedAt,
    });
  });
  const nextUrl =
    $('link[rel="next"], a.next, a[rel="next"], .nav-previous a').first().attr("href") ?? null;
  return { articles, nextUrl };
}

export const meta: Source = {
  id: "meta",
  name: "Meta Engineering",
  fetch: () => fetchRss("https://engineering.fb.com/feed/", "meta"),
  backfill: () => crawlArchive("https://engineering.fb.com/", parseMetaArchivePage),
};
