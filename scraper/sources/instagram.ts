import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Instagram Engineering.
 *
 * Instagram no longer runs its own engineering blog: `instagram-engineering.com`
 * doesn't resolve (connection refused) and `engineering.instagram.com` 301s to
 * `www.instagram-engineering.com`, which also doesn't resolve — both are dead.
 * Instagram engineering content has been folded into Meta's "Engineering at
 * Meta" blog (the same site the `meta` source already covers), but it isn't
 * just undifferentiated Meta content: the site has a dedicated, crawlable
 * `instagram` tag archive at `engineering.fb.com/tag/instagram/`, distinct
 * from the general `meta` feed/archive, with real per-post dates (verified
 * against both the tag's RSS feed and the raw archive HTML).
 *
 * The tag's RSS feed (`engineering.fb.com/tag/instagram/feed/`) is shallow —
 * 9 items, 2023-08-07 through 2025-11-17 at capture time — so `backfill`
 * crawls the tag's paginated archive instead, which reaches back to
 * 2020-10-21 ("How Facebook is bringing QUIC to billions") across 2 pages
 * (verified at capture time; "page/2/" was the last page, no `rel="next"`).
 *
 * Markup matches the WordPress structure captured for the `meta` source
 * (fixture: `tests/fixtures/instagram-archive.html`, captured from
 * `engineering.fb.com/tag/instagram/page/2/`):
 * - Each post is an `<article>` element.
 * - The title link is the `<a>` inside `.entry-title` (falls back to the
 *   first non-image link when a post has no `.entry-title` wrapper).
 * - Published date: posts' URLs embed the publish date as `/YYYY/MM/DD/`,
 *   used as the primary source of truth, falling back to a `<time
 *   datetime>` element's text when a URL doesn't match.
 * - Category links: `<a rel="category tag" ...>`.
 * - Next page: `<link rel="next">` in the document `<head>` (present on
 *   page 1, absent on the final page).
 */
export function parseInstagramArchivePage(html: string, _pageUrl: string): ArchivePage {
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

    articles.push({
      id: articleId(href),
      title,
      url: normalizeUrl(href),
      source: "instagram",
      publishedAt,
      tags: resolveTags(
        post
          .find('a[rel~="category"]')
          .map((_j, tag) => $(tag).text().trim())
          .get()
          .filter(Boolean),
        "instagram",
      ),
      summary: summarize(post.find(".entry-content, .entry-summary, p").first().html() ?? ""),
      fetchedAt,
    });
  });
  const nextUrl =
    $('link[rel="next"], a.next, a[rel="next"], .nav-previous a').first().attr("href") ?? null;
  return { articles, nextUrl };
}

export const instagram: Source = {
  id: "instagram",
  name: "Instagram Engineering",
  fetch: () => fetchRss("https://engineering.fb.com/tag/instagram/feed/", "instagram"),
  backfill: () =>
    crawlArchive("https://engineering.fb.com/tag/instagram/", parseInstagramArchivePage),
};
