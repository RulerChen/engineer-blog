import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * AWS Architecture Blog archive → articles + next-page link.
 *
 * `aws.amazon.com/blogs/architecture/feed/` is real (verified genuine
 * `<pubDate>` values in the raw XML) but shallow — only 20 items, spanning
 * 2026-05-19 through 2026-07-09 at capture time. The blog is WordPress-based
 * and paginates as `/architecture/page/N/`; the last page currently is
 * `/architecture/page/79/`, reaching back to a post dated 2014-03-16 —
 * verified via the page's own `<time datetime>` values, not assumed.
 *
 * Selectors match the captured fixture (aws.amazon.com/blogs/architecture/page/2/):
 * - Each post is an `<article class="blog-post">`.
 * - Title: `h2.blog-post-title a` (the same link is also the post URL).
 * - Published date: a real `<time property="datePublished" datetime="...">`
 *   inside `footer.blog-post-meta` — a genuine ISO-with-offset datetime.
 * - Categories: `.blog-post-categories a` inside the same footer, one anchor
 *   per topic (e.g. "Announcements", "AWS Well-Architected Tool").
 * - Summary: the `<p>` inside `section.blog-post-excerpt`.
 * - Thumbnail: `img.wp-post-image` inside the card.
 * - Next page: `<link rel="next">` in `<head>`, mirrored by an
 *   `a.lb-btn-p` "Older posts" link in the body (used as fallback).
 */
export function parseAwsArchitectureArchivePage(html: string, pageUrl: string): ArchivePage {
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
      source: "aws-architecture",
      publishedAt,
      tags: resolveTags(categories, "aws-architecture"),
      summary: summarize(post.find("section.blog-post-excerpt p").first().html() ?? ""),
      fetchedAt,
    });
  });
  const next = $('link[rel="next"]').first().attr("href") ?? $("a.lb-btn-p").first().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

export const awsArchitecture: Source = {
  id: "aws-architecture",
  name: "AWS Architecture Blog",
  fetch: () => fetchRss("https://aws.amazon.com/blogs/architecture/feed/", "aws-architecture"),
  backfill: () =>
    crawlArchive("https://aws.amazon.com/blogs/architecture/", parseAwsArchitectureArchivePage),
};
