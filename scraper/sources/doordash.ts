import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { stripHtml, summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

const ENGINEERING_CATEGORY_ID = 8; // careersatdoordash.com "Engineering" category
const PAGE_SIZE = 20;

interface WpTerm {
  name: string;
  taxonomy: string;
}

interface WpApiPost {
  link: string;
  date_gmt: string;
  title: { rendered: string };
  excerpt?: { rendered: string };
  _embedded?: {
    "wp:term"?: WpTerm[][];
    "wp:featuredmedia"?: { source_url?: string }[];
  };
}

function buildArchiveUrl(page: number): string {
  const params = new URLSearchParams({
    categories: String(ENGINEERING_CATEGORY_ID),
    per_page: String(PAGE_SIZE),
    page: String(page),
    _embed: "wp:term,wp:featuredmedia",
  });
  return `https://careersatdoordash.com/wp-json/wp/v2/posts?${params.toString()}`;
}

/**
 * DoorDash Engineering blog archive → articles + next-page URL.
 *
 * `doordash.engineering` (the domain named in the task) no longer hosts the
 * blog — it 302-redirects to `careersatdoordash.com/career-areas/engineering/`,
 * and its `/feed/` returns a WordPress.com "domain connection not found"
 * error. The real blog moved to `careersatdoordash.com`, under an
 * "Engineering" WordPress category (id 8, 332 posts as of this writing).
 * Its own `/feed/` only ever returns the latest ~10 site-wide posts with no
 * further pagination (`?paged=2` 404s), and the human-facing
 * `/engineering-blog/` and `/blog/` listing pages are React/AJAX "Load more"
 * views with no dates and no real pagination markup — same class of problem
 * as Dropbox's homepage.
 *
 * The classic WordPress category archive at
 * `/blog/category/engineering/` *is* real server-rendered HTML with genuine
 * `<time datetime>` values — but its own `/page/N/` pagination links 404
 * unconditionally (even freshly, with cookies/referer set), so it can't
 * actually be crawled past page 1 via HTML.
 *
 * The site's WordPress REST API is not blocked, though, and exposes the same
 * "Engineering" category with working pagination:
 * `/wp-json/wp/v2/posts?categories=8&per_page=20&page=N`, `_embed`ded with
 * `wp:term` (category names). Each post
 * carries a real `date_gmt`. This parser reads that JSON response instead of
 * HTML — `crawlArchive`'s `parsePage` just receives whatever body text the
 * URL returns, JSON or HTML, so this fits the same crawler. Since 332 isn't a
 * multiple of the page size (20), the last page always returns fewer than
 * `PAGE_SIZE` posts, which is used as the "no more pages" signal.
 */
export function parseDoordashArchivePage(json: string, pageUrl: string): ArchivePage {
  const posts = JSON.parse(json) as WpApiPost[];
  const fetchedAt = new Date().toISOString();

  const articles: Article[] = posts
    .filter((post) => post.link && post.title?.rendered)
    .map((post) => {
      const categories = (post["_embedded"]?.["wp:term"] ?? [])
        .flat()
        .filter((term) => term.taxonomy === "category")
        .map((term) => term.name);
      const publishedAt =
        post.date_gmt && !Number.isNaN(Date.parse(`${post.date_gmt}Z`))
          ? new Date(`${post.date_gmt}Z`).toISOString()
          : "";

      return {
        id: articleId(post.link),
        title: stripHtml(post.title.rendered),
        url: normalizeUrl(post.link),
        source: "doordash",
        publishedAt,
        tags: resolveTags(categories, "doordash"),
        summary: summarize(post.excerpt?.rendered ?? ""),
        fetchedAt,
      };
    });

  const currentPage = Number(new URL(pageUrl).searchParams.get("page") ?? "1");
  const nextUrl = posts.length === PAGE_SIZE ? buildArchiveUrl(currentPage + 1) : null;
  return { articles, nextUrl };
}

export const doordash: Source = {
  id: "doordash",
  name: "DoorDash Engineering",
  fetch: () => crawlArchive(buildArchiveUrl(1), parseDoordashArchivePage, { maxPages: 1 }),
  backfill: () => crawlArchive(buildArchiveUrl(1), parseDoordashArchivePage),
};
