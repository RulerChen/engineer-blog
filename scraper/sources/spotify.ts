import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

/**
 * Spotify Engineering blog archive → articles + next-page link.
 *
 * engineering.atspotify.com is a Next.js frontend over a headless WordPress
 * backend (the RSS feed's `<generator>` is `wordpress.org`, but there is no
 * WordPress theme serving HTML pages). The homepage renders a genuine
 * server-rendered, reverse-chronological list of posts (one featured
 * `.sticky-post` plus a grid of `.post-card`s), but everything past that
 * initial batch is loaded by a client-side "Load More" button
 * (`button.btn-load-more`) whose backing request is not present in the
 * server-rendered markup and could not be reverse-engineered from static
 * HTML alone. Every classic pagination scheme was tried and ruled out:
 * - `/page/2/`, `/page/2` → HTTP 404 (no WordPress-style path pagination).
 * - `/?page=2` → HTTP 200 but byte-identical to `/` (query param ignored
 *   server-side; this is client-only Next.js routing).
 * - `/category/<slug>` and `/category/<slug>/` → HTTP 500 / redirect loop,
 *   no post markup renders.
 * - `/wp-json/wp/v2/posts` → HTTP 404 (REST API not publicly exposed).
 * - `/feed/?paged=2` → HTTP 308 → 200 but identical to `/feed/` (always the
 *   5 most recent posts; WordPress's own feed pagination is disabled).
 * - `/all-stories`, `/archive`, `/all-posts`, `/posts`, `/stories` → all 404
 *   (no separate full-listing page exists, unlike e.g. dropbox.tech).
 *
 * So, as with dropbox.tech's homepage-only fallback, the homepage is used as
 * a single-page "archive": it contains more posts (13, back to Nov 24, 2025
 * as of this writing) than the 5-item RSS feed, but does not reach anywhere
 * near 2015 — there is no way to page past what's already server-rendered.
 * `crawlArchive` is used for consistency with the other sources; the parser
 * always returns `nextUrl: null`, so it fetches exactly one page.
 *
 * Selectors match the captured fixture (engineering.atspotify.com/):
 * - The featured post is `<section class="sticky-post">`; every other post
 *   is a `<div class="post-card">`. Both share the same internal shape, just
 *   with `sticky-post__*` vs `post-card__*` class prefixes, so both are
 *   walked together.
 * - Title link + href: the `<a>` wrapping the `.sticky-post__title` /
 *   `.post-card__title` heading (the href is relative, e.g.
 *   `/2026/6/some-slug`, and is resolved against `pageUrl`).
 * - Published date: `.sticky-post__date` / `.post-card__date`, formatted as
 *   "MMM D, YYYY" (e.g. "Jun 10, 2026"), which `Date.parse` handles.
 * - Category/tag: `.sticky-post__tags a.tag` / `.post-card__tags a.tag`.
 * - Summary: `.sticky-post__description` / `.post-card__description`.
 * - Thumbnail: the `<img>` inside `.sticky-post__image` / `.post-card__image`.
 */
export function parseSpotifyArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $(".sticky-post, .post-card").each((_i, el) => {
    const post = $(el);
    const isSticky = post.hasClass("sticky-post");
    const prefix = isSticky ? "sticky-post" : "post-card";
    const titleEl = post.find(`.${prefix}__title`).first();
    const link = titleEl.closest("a").length ? titleEl.closest("a") : titleEl.parent("a");
    const href = link.attr("href");
    const title = titleEl.text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const dateText = post.find(`.${prefix}__date`).first().text().trim();
    const publishedAt =
      dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : "";

    const summary = summarize(post.find(`.${prefix}__description`).first().text().trim());
    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "spotify",
      publishedAt,
      tags: resolveTags(
        post
          .find(`.${prefix}__tags a.tag`)
          .map((_j, tag) => $(tag).text().trim())
          .get()
          .filter(Boolean),
        "spotify",
        `${title} ${summary}`,
      ),
      summary,
      fetchedAt,
    });
  });
  return { articles, nextUrl: null };
}

export const spotify: Source = {
  id: "spotify",
  name: "Spotify Engineering",
  fetch: () => fetchRss("https://engineering.atspotify.com/feed/", "spotify"),
  backfill: () => crawlArchive("https://engineering.atspotify.com/", parseSpotifyArchivePage),
};
