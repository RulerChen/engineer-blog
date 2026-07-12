import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Slack Engineering blog archive → articles + next-page link.
 *
 * `slack.engineering/articles/` (WordPress-based, "Engineering at Slack")
 * paginates as `/articles/page/N/`, currently 25 pages deep, with the last
 * page (`/articles/page/25/`) reaching back to a post dated January 25, 2016
 * — no bot/geo blocking encountered, unlike Uber's `www.uber.com`.
 *
 * Selectors match the captured fixture (slack.engineering/articles/page/2/):
 * - Each post is an `<article class="post-NNNNN ... ts-entry">` — matched
 *   via `article.ts-entry` (the class list is otherwise post-specific, so no
 *   single class is shared except `ts-entry`).
 * - Title link: `h2.ts-entry__title a`.
 * - Published date: there is no `<time>` element at all on this theme —
 *   the only date is human-readable text in `div.ts-meta-date` (e.g.
 *   "November 6, 2025"), which `Date.parse` handles fine.
 * - Category/tag: the theme doesn't expose real WordPress categories in the
 *   markup (every post carries only the placeholder `category-uncategorized`
 *   class) — the real taxonomy instead shows up as `tag-<slug>` classes on
 *   the `<article>` element itself (e.g. `tag-machine-learning`), so those
 *   are extracted from the class attribute and de-slugified before being
 *   run through `resolveTags`.
 * - Summary: `p.ts-entry__excerpt`.
 * - Next page: `.nav-links a.next.page-numbers` — there is no `<link
 *   rel="next">` in `<head>` on this theme (unlike engineering.fb.com), so
 *   the in-body pagination nav is the only source of the next-page URL.
 */
export function parseSlackArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("article.ts-entry").each((_i, el) => {
    const post = $(el);
    const link = post.find("h2.ts-entry__title a").first();
    const href = link.attr("href");
    const title = link.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateText = post.find(".ts-meta-date").first().text().trim();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";

    const classAttr = post.attr("class") ?? "";
    const tags = [...classAttr.matchAll(/(?:^|\s)tag-([a-z0-9-]+)/g)].map((m) =>
      m[1].replace(/-/g, " "),
    );

    const summary = summarize(post.find(".ts-entry__excerpt").first().html() ?? "");
    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "slack",
      publishedAt,
      tags: resolveTags(tags, "slack", `${title} ${summary}`),
      summary,
      fetchedAt,
    });
  });
  const next = $(".nav-links a.next.page-numbers, a[rel='next']").first().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

export const slack: Source = {
  id: "slack",
  name: "Slack Engineering",
  fetch: () => fetchRss("https://slack.engineering/feed/", "slack"),
  backfill: () => crawlArchive("https://slack.engineering/articles/", parseSlackArchivePage),
};
