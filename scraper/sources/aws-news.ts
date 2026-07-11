import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * AWS News Blog archive → articles + next-page link.
 *
 * `aws.amazon.com/blogs/aws/feed/` is real (verified genuine `<pubDate>`
 * values in the raw XML) but shallow — only 20 items, spanning 2026-06-10
 * through 2026-07-06 at capture time. The blog shares the same
 * WordPress-based platform and markup as the AWS Architecture Blog and
 * paginates as `/aws/page/N/`; the last page currently is
 * `/aws/page/589/` (a single post), reaching all the way back to
 * 2004-11-09 — verified via the page's own `<time datetime>` values, not
 * assumed. That is far deeper than any other source's archive in this
 * project, so `backfill` raises `maxPages` well above `crawlArchive`'s
 * 200-page default to actually reach the end.
 *
 * Selectors match the captured fixture (aws.amazon.com/blogs/aws/page/2/) —
 * identical markup to the Architecture Blog:
 * - Each post is an `<article class="blog-post">`.
 * - Title: `h2.blog-post-title a` (the same link is also the post URL).
 * - Published date: a real `<time property="datePublished" datetime="...">`
 *   inside `footer.blog-post-meta` — a genuine ISO-with-offset datetime.
 * - Categories: `.blog-post-categories a` inside the same footer.
 * - Summary: the `<p>` inside `section.blog-post-excerpt`.
 * - Thumbnail: `img.wp-post-image` inside the card.
 * - Next page: `<link rel="next">` in `<head>`, mirrored by an
 *   `a.lb-btn-p` "Older posts" link in the body (used as fallback).
 */
export function parseAwsNewsArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article.blog-post").each((_i, el) => {
    const post = $(el);
    const link = post.find("h2.blog-post-title a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateAttr =
      post.find("footer.blog-post-meta time[datetime]").first().attr("datetime") ?? "";
    const publishedAt =
      dateAttr && !Number.isNaN(Date.parse(dateAttr)) ? new Date(dateAttr).toISOString() : "";
    const categories = post
      .find(".blog-post-categories a")
      .map((_j, cat) => $(cat).text().trim())
      .get()
      .filter(Boolean);

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "aws-news",
      publishedAt,
      tags: resolveTags(categories, "aws-news"),
      summary: summarize(post.find("section.blog-post-excerpt p").first().html() ?? ""),
      thumbnail: post.find("img.wp-post-image").first().attr("src") ?? null,
      fetchedAt,
    });
  });
  const next = $('link[rel="next"]').first().attr("href") ?? $("a.lb-btn-p").first().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

/**
 * The full archive is ~22 posts/page × 589 pages (~13k articles, back to
 * 2004) — wildly out of proportion with every other source in this project
 * and far too slow to crawl at the polite per-page delay. `backfill` caps
 * at 45 pages (~1,000 articles, back to roughly a year) instead of chasing
 * the full depth.
 */
export const awsNews: Source = {
  id: "aws-news",
  name: "AWS News Blog",
  fetch: () => fetchRss("https://aws.amazon.com/blogs/aws/feed/", "aws-news"),
  backfill: () =>
    crawlArchive("https://aws.amazon.com/blogs/aws/", parseAwsNewsArchivePage, { maxPages: 45 }),
};
