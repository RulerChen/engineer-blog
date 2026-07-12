import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Duolingo Engineering blog archive → articles + next-page link.
 *
 * blog.duolingo.com is a general Ghost-powered company blog (language
 * learning content, chess, product announcements, etc.) with an
 * "Engineering" category. Its RSS feed at `/rss/` (and the tag-scoped
 * `/tag/engineering/rss/`, which was tried first) both ignore the tag filter
 * and return the same firehose of all posts regardless of category — verified
 * by inspecting the raw XML, whose `<category>` values for `/tag/engineering/rss/`
 * items were completely unrelated (chess, Spanish grammar, etc.), never
 * "Engineering". Neither feed is usable to isolate engineering posts.
 *
 * The real engineering-only listing lives at `/hub/engineering/`, a
 * server-rendered hub page with one desktop hero post (with date + author)
 * and three "featured card" posts underneath (each with its own date); an
 * `<template id="postTemplate">` further down is meant to be filled in by a
 * client-side "load more" script hitting an internal API with no key
 * available to us, so any posts beyond those four are not reachable from
 * static HTML. There is no `/hub/engineering/page/2/`-style pagination
 * (confirmed 404), so this page is a single, non-paginated listing — same
 * situation as `eng.uber.com/` in uber.ts. `parsePage` always returns
 * `nextUrl: null`.
 *
 * Selectors match the captured fixture (blog.duolingo.com/hub/engineering/):
 * - `<template>` markup is stripped first so its inert placeholder card
 *   (also classed `.featured-card`) isn't picked up as a real post.
 * - The hero post: `section.heroSection.desktop-view` (a duplicate
 *   `.mobile-view` hero repeats the same post without a date, so only the
 *   desktop variant is used). Title is the `<h1>`'s enclosing `<a>`; date is
 *   `time[datetime]` (ISO `YYYY-MM-DD`); summary is `.hero--description p`.
 * - Each of the three "featured card" posts: `div.featured-card`. The title
 *   link is the direct-child `<a>` of `.feature-card--content` (the other
 *   `<a>` there, for the author, sits nested inside `.caption-wrap` and is
 *   excluded by the child combinator); date is `time[datetime]`. These cards
 *   carry no excerpt text in the markup, so `summary` is left empty.
 * - No per-post category data is present in the markup (only the implicit
 *   page-level "Engineering" tag), so every article is tagged `["Engineering"]`.
 */
export function parseDuolingoArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  $("template").remove();
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];

  const addArticle = (
    href: string | undefined,
    title: string,
    dateText: string | undefined,
    summaryHtml: string,
  ) => {
    if (!href || !title) return;
    const absolute = new URL(href, pageUrl).toString();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";
    const summary = summarize(summaryHtml);
    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "duolingo",
      publishedAt,
      tags: resolveTags(["Engineering"], "duolingo", `${title} ${summary}`),
      summary,
      fetchedAt,
    });
  };

  const hero = $("section.heroSection.desktop-view").first();
  if (hero.length) {
    const titleEl = hero.find("h1").first();
    const link = titleEl.closest("a");
    addArticle(
      link.attr("href"),
      titleEl.text().trim(),
      hero.find("time[datetime]").first().attr("datetime"),
      hero.find(".hero--description p").first().html() ?? "",
    );
  }

  $("div.featured-card").each((_i, el) => {
    const card = $(el);
    const link = card.find(".feature-card--content > a").first();
    const title = link.find("h3").first().text().trim();
    addArticle(link.attr("href"), title, card.find("time[datetime]").first().attr("datetime"), "");
  });

  return { articles, nextUrl: null };
}

/**
 * Neither `/rss/` nor `/tag/engineering/rss/` carry a usable per-item
 * category filter (see above), so `fetch` reuses the `/hub/engineering/`
 * archive parser with `maxPages: 1`, matching the pattern already used for
 * google.ts and uber.ts when a source's real RSS feed can't be trusted.
 * `backfill` points at the same single, non-paginated page — there is no
 * deeper archive reachable without the client-side "load more" API.
 */
export const duolingo: Source = {
  id: "duolingo",
  name: "Duolingo Engineering",
  fetch: () =>
    crawlArchive("https://blog.duolingo.com/hub/engineering/", parseDuolingoArchivePage, {
      maxPages: 1,
    }),
  backfill: () =>
    crawlArchive("https://blog.duolingo.com/hub/engineering/", parseDuolingoArchivePage),
};
