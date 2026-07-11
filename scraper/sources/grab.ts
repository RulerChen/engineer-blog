import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Grab Tech blog (`engineering.grab.com`) archive → articles + next-page link.
 *
 * `engineering.grab.com/feed.xml` is a real Jekyll-generated feed with a
 * genuine per-item `<pubDate>` (verified against the raw XML), but like most
 * Jekyll feeds it only carries the ~10 most recent posts — fine for `fetch`,
 * not enough for `backfill`.
 *
 * The blog's homepage, however, isn't paginated in the usual sense: every
 * post since the blog's founding (running since ~2016, captured fixture
 * reaches back to "The Curious Case of the Phantom Instance", 28 Dec 2015)
 * is already server-rendered into the page in one response — a client-side
 * "topic filter" toggles which cards are visible, but all of them are
 * present in the initial HTML (confirmed by the earliest post in the
 * fixture's card markup matching the earliest entry in the page's embedded
 * `window.blogSearchIndex` JSON search index). So `crawlArchive` is used
 * with a single request that always yields `nextUrl: null`.
 *
 * Selectors match the captured fixture (engineering.grab.com/):
 * - The newest post uses a distinct "featured" template: `div.latest-post`,
 *   with its title link as `a.post-title`, tags as `a.tags-label`, summary
 *   in `.post-content`, and its date as human-readable text in
 *   `.post-date` (e.g. "10 Jul 2026 7 min read" — the read-time badge text
 *   is a nested span and is stripped before parsing).
 * - Every other post is an `<article class="post-card">`; title in
 *   `h3.post-card-title`, link in the wrapping `a.post-card-link`, tags in
 *   `span.post-card-tag`, and a real `<time datetime="ISO">` in
 *   `.post-card-meta` — no separate summary snippet on these cards.
 * - Thumbnail: the card's first `<img>` `src` (absent on posts with no
 *   cover image).
 */
export function parseGrabArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];

  const featured = $("div.latest-post").first();
  const featuredLink = featured.find("a.post-title").first();
  const featuredHref = featuredLink.attr("href");
  const featuredTitle = featuredLink.text().trim();
  if (featuredHref && featuredTitle) {
    const absolute = new URL(featuredHref, pageUrl).toString();
    const dateClone = featured.find(".post-date").first().clone();
    dateClone.find("span").remove();
    const dateText = dateClone.text().trim();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";
    const tags = featured
      .find("a.tags-label")
      .map((_i, tag) => $(tag).text().trim())
      .get()
      .filter(Boolean);
    articles.push({
      id: articleId(absolute),
      title: featuredTitle,
      url: normalizeUrl(absolute),
      source: "grab",
      publishedAt,
      tags: resolveTags(tags, "grab"),
      summary: summarize(featured.find(".post-content").first().html() ?? ""),
      fetchedAt,
    });
  }

  $("article.post-card").each((_i, el) => {
    const post = $(el);
    const link = post.find("a.post-card-link").first();
    const href = link.attr("href");
    const title = post.find("h3.post-card-title").first().text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateAttr = post.find("time[datetime]").first().attr("datetime") ?? "";
    const publishedAt =
      dateAttr && !Number.isNaN(Date.parse(dateAttr)) ? new Date(dateAttr).toISOString() : "";
    const tags = post
      .find("span.post-card-tag")
      .map((_i, tag) => $(tag).text().trim())
      .get()
      .filter(Boolean);

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "grab",
      publishedAt,
      tags: resolveTags(tags, "grab"),
      summary: summarize(""),
      fetchedAt,
    });
  });

  return { articles, nextUrl: null };
}

export const grab: Source = {
  id: "grab",
  name: "Grab Engineering",
  fetch: () => fetchRss("https://engineering.grab.com/feed.xml", "grab"),
  backfill: () => crawlArchive("https://engineering.grab.com/", parseGrabArchivePage),
};
