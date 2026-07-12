import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Figma Engineering blog archive → articles + next-page link.
 *
 * figma.com/blog has no RSS feed at all (`/blog/feed`, `/blog/feed.xml`,
 * `/blog/rss.xml` all 404, and there is no `<link rel="alternate"
 * type="application/rss+xml">` in the page `<head>`). It does expose a real
 * server-rendered "Engineering" category page at `/blog/engineering/` with a
 * publish date on every card. That page shows a "Load more" button whose
 * href is `?page=2`, but the query string is ignored server-side — every
 * page number returns byte-identical HTML to the plain URL (verified by
 * diffing the two responses) — so this is a single curated listing, not a
 * true paginated archive; `nextUrl` is always `null`.
 *
 * Selectors match the captured fixture (figma.com/blog/engineering/):
 * - Each post is an `<article aria-label="…">` — the only class on these
 *   elements is a build-hashed CSS-module name (e.g. `fig-0`) that isn't
 *   shared consistently across cards, so the stable `aria-label` attribute
 *   is used instead of any class.
 * - Title + link: the post's `<h3>` sits inside the wrapping `<a>`, found
 *   via `h3`'s `.closest("a")`.
 * - Published date: `<time dateTime="…">` with a human-readable value (e.g.
 *   "July 1, 2026"), which `Date.parse` handles directly.
 * - Tags: `ul[aria-label="Tags"] a`.
 * - Summary: the `<p>` inside the card's `<footer>`.
 * - Thumbnail: some cards have no image at all; when present, each card
 *   renders both a tiny base64 LQIP placeholder `<img>` and the real image
 *   `<img data-loading="true">` — only the latter is used.
 */
export function parseFigmaArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article[aria-label]").each((_i, el) => {
    const post = $(el);
    const titleEl = post.find("h3").first();
    const title = titleEl.text().trim();
    const link = titleEl.closest("a");
    const href = link.attr("href");
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateText = post.find("time[datetime]").first().attr("datetime") ?? "";
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";
    const tags = post
      .find('ul[aria-label="Tags"] a')
      .map((_j, tag) => $(tag).text().trim())
      .get()
      .filter(Boolean);

    const summary = summarize(post.find("footer p").first().html() ?? "");
    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "figma",
      publishedAt,
      tags: resolveTags(tags, "figma", `${title} ${summary}`),
      summary,
      fetchedAt,
    });
  });
  return { articles, nextUrl: null };
}

/**
 * `/blog/engineering/` is a single curated listing (see above) with no
 * working pagination, so `fetch` and `backfill` crawl the same URL; the
 * `maxPages: 1` on `fetch` is a no-op here (the parser already returns
 * `nextUrl: null`) but keeps the daily/backfill split consistent with the
 * other sources that share this pattern (Uber, Dropbox).
 */
export const figma: Source = {
  id: "figma",
  name: "Figma Engineering",
  fetch: () =>
    crawlArchive("https://www.figma.com/blog/engineering/", parseFigmaArchivePage, {
      maxPages: 1,
    }),
  backfill: () => crawlArchive("https://www.figma.com/blog/engineering/", parseFigmaArchivePage),
};
