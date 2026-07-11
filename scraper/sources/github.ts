import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * GitHub Blog engineering archive → articles + next-page link.
 *
 * `github.blog/engineering/` (WordPress-based) paginates as
 * `/engineering/page/N/`, currently 11 pages deep, with the last page
 * (`/engineering/page/11/`) reaching back to posts from November 2015 /
 * April 2016.
 *
 * Selectors match the captured fixture (github.blog/engineering/page/2/):
 * - Each real post is an `<article class="color-border-muted post-card">`.
 *   The page also recirculates unrelated docs/marketing links in a
 *   different widget that happens to reuse the `post-card` class on plain
 *   `<li>` elements — scoping to `article.post-card` excludes those.
 * - Title link: `a.post-card__link` (`h3 > a`), which is also the post URL.
 * - Published date: a real `<time datetime="YYYY-MM-DD">` element in the
 *   footer — an actual ISO date, not just human text.
 * - Category: the single `a.first-post-category` link above the title.
 * - Summary: the `<p>` inside the `.f4-mktg.color-fg-muted` div.
 * - Thumbnail: `img.wp-post-image` inside the card's thumbnail wrapper.
 * - Next page: `<link rel="next">` in `<head>`, mirrored by
 *   `.pagination a.next_page` in the body.
 */
export function parseGithubArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article.post-card").each((_i, el) => {
    const post = $(el);
    const link = post.find("a.post-card__link").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateAttr = post.find("time[datetime]").first().attr("datetime") ?? "";
    const publishedAt =
      dateAttr && !Number.isNaN(Date.parse(dateAttr)) ? new Date(dateAttr).toISOString() : "";
    const category = post.find("a.first-post-category").first().text().trim();

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "github",
      publishedAt,
      tags: resolveTags(category ? [category] : [], "github"),
      summary: summarize(post.find(".f4-mktg.color-fg-muted p").first().html() ?? ""),
      thumbnail: post.find("img.wp-post-image").first().attr("src") ?? null,
      fetchedAt,
    });
  });
  const next =
    $('link[rel="next"]').first().attr("href") ?? $(".pagination a.next_page").first().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

export const github: Source = {
  id: "github",
  name: "GitHub Engineering",
  fetch: () => fetchRss("https://github.blog/engineering/feed/", "github"),
  backfill: () => crawlArchive("https://github.blog/engineering/", parseGithubArchivePage),
};
