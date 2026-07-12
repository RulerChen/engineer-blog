import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Uber Engineering blog archive → articles + next-page link.
 *
 * `www.uber.com/blog/engineering/page/2/` (and every plain variant tried:
 * no trailing slash, no `/page/N`, `/en-US/` prefix) returns HTTP 406 from
 * this sandbox — consistent with the bot/geo protection already noted for
 * this domain in Task 8. However `eng.uber.com/` (Uber's real, TLS-valid
 * `*.uber.com`-certified engineering-blog landing page, served off Uber's own
 * CDN) responds 200 with genuine server-rendered post markup: every post is
 * an `<a class="blog-card">` linking to `www.uber.com/blog/...` with a
 * `data-date` attribute, an `<h3 class="blog-card-title">`, and a
 * `<p class="blog-card-excerpt">`. That page is a single curated listing
 * with no pagination controls (no `/page/`, no `rel="next"`) — the parser
 * always returns `nextUrl: null`, which crawlArchive treats as "last page".
 *
 * Selectors match the captured fixture (eng.uber.com/):
 * - Each post is an `<a class="blog-card">` (the link itself is the card).
 * - Title: `<h3 class="blog-card-title">` inside the card.
 * - Published date: the card's `data-date` attribute (ISO `YYYY-MM-DD`).
 * - Category/tag: the card's `data-category` attribute.
 * - Summary: `<p class="blog-card-excerpt">` inside the card.
 * - Thumbnail: `<img class="blog-card-img">` `src` inside the card.
 */
export function parseUberArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("a.blog-card").each((_i, el) => {
    const card = $(el);
    const href = card.attr("href");
    const title = card.find(".blog-card-title").first().text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const date = card.attr("data-date") ?? "";
    const publishedAt = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : "";
    const category = card.attr("data-category")?.trim();

    const summary = summarize(card.find(".blog-card-excerpt").first().html() ?? "");
    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "uber",
      publishedAt,
      tags: resolveTags(category ? [category] : [], "uber", `${title} ${summary}`),
      summary,
      fetchedAt,
    });
  });
  const next = $("a[rel='next'], a[href*='/page/']").last().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

/**
 * `www.uber.com/blog/engineering/rss/` returns HTTP 406 unconditionally —
 * same bot/geo protection on `www.uber.com` documented above for the
 * archive pages, and it doesn't vary by User-Agent. `eng.uber.com/` isn't
 * blocked and is already used for `backfill`; `fetch` reuses that same
 * parser instead of the feed. Since `eng.uber.com/` is a single curated
 * listing with no pagination, this naturally returns just its one page.
 */
export const uber: Source = {
  id: "uber",
  name: "Uber Engineering",
  fetch: () => crawlArchive("https://eng.uber.com/", parseUberArchivePage, { maxPages: 1 }),
  backfill: () => crawlArchive("https://eng.uber.com/", parseUberArchivePage),
};
