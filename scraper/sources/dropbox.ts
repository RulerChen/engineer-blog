import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Dropbox Tech blog archive → articles + next-page link.
 *
 * dropbox.tech's homepage is a curated set of sections ("Featured", "Latest",
 * per-category carousels) whose "load more" buttons are AEM/AJAX-driven
 * (`data-dr-expand-url="…articlesection…paging.json/{{PAGE_ID}}"`) but that
 * endpoint 404s when requested directly outside the CMS request context, and
 * `?page=N` on the homepage is ignored server-side (every page number returns
 * byte-identical HTML) — so the homepage cannot serve as a backfill source.
 *
 * dropbox.tech does, however, expose a real server-rendered, single-page,
 * reverse-chronological listing at `/all-stories` that on its own contains
 * every post back to the blog's founding (captured fixture has 404 posts
 * spanning Jun 2026 down to Jul 2010) — far beyond the 2015 backfill target.
 * There is no pagination on this page (no `/page/`, no `rel="next"`, and its
 * own `data-dr-expand-url` 404s the same way as the homepage's), so the whole
 * archive is already present in one response; `crawlArchive` is used anyway
 * for consistency with the other sources, and simply always yields
 * `nextUrl: null` after the first (only) page.
 *
 * Selectors match the captured fixture (dropbox.tech/all-stories):
 * - Each post is an `<li class="dr-article-section__list-item">`.
 * - Title link + text: `<a data-element-id="article-link">` wrapping a
 *   `<span data-element-id="article-title">`.
 * - Published date: `<span data-element-id="article-date">`, formatted as
 *   "MMM DD, YYYY" (e.g. "Jun 25, 2026"), which `Date.parse` handles directly.
 * - Category/tag: `<a data-element-id="article-category-link">`, the single
 *   tag shown alongside the date in the same `<p>`.
 * - No summary is present on this listing (unlike the homepage's teaser
 *   cards), so it is left empty for backfilled articles.
 */
export function parseDropboxArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("li.dr-article-section__list-item").each((_i, el) => {
    const post = $(el);
    const link = post.find("a[data-element-id='article-link']").first();
    const href = link.attr("href");
    const title = link.find("[data-element-id='article-title']").first().text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateText = post.find("[data-element-id='article-date']").first().text().trim();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";
    const category = post.find("a[data-element-id='article-category-link']").first().text().trim();

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "dropbox",
      publishedAt,
      tags: resolveTags(category ? [category] : [], "dropbox"),
      summary: summarize(""),
      fetchedAt,
    });
  });
  const next = $("a[rel='next'], a[href*='/page/']").last().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

export const dropbox: Source = {
  id: "dropbox",
  name: "Dropbox Tech",
  fetch: () => fetchRss("https://dropbox.tech/feed", "dropbox"),
  backfill: () => crawlArchive("https://dropbox.tech/all-stories", parseDropboxArchivePage),
};
