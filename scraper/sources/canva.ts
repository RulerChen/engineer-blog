import * as cheerio from "cheerio";
import type { ArchivePage } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { fetchRss } from "../src/rss.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

interface CanvaPost {
  title: string;
  abstract?: string;
  publishedDate: number; // epoch ms
  tags?: string[];
  slug: string; // e.g. "/blog/engineering/some-post/"
}

interface CanvaNextData {
  props: { pageProps: { posts: CanvaPost[] } };
}

/**
 * Canva Engineering blog archive → articles + next-page link.
 *
 * `www.canva.dev/blog/engineering/` is a Next.js app. There is no WordPress-
 * style pagination (`/page/2/` 404s) and no separate `/archive` route, but
 * the single listing page is server-rendered as a static Next.js page whose
 * `<script id="__NEXT_DATA__">` payload embeds `props.pageProps.posts`: every
 * post the blog has ever published (68 as of this writing), each with a
 * `title`, `abstract`, `publishedDate` (epoch ms), `tags`, and a `slug`
 * (e.g. `/blog/engineering/functional-completeness-and-local-hermeticity/`,
 * dated April 2015 — the blog's oldest post). So instead of a DOM/CSS
 * selector, this parser reads that embedded JSON directly; the whole archive
 * is already present in one response, so `nextUrl` is always `null`.
 */
export function parseCanvaArchivePage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];

  const raw = $("script#__NEXT_DATA__").first().html();
  const posts: CanvaPost[] = raw
    ? ((JSON.parse(raw) as CanvaNextData).props?.pageProps?.posts ?? [])
    : [];

  for (const post of posts) {
    if (!post.slug || !post.title) continue;
    const absolute = new URL(post.slug, pageUrl).toString();
    const publishedAt =
      typeof post.publishedDate === "number" && !Number.isNaN(post.publishedDate)
        ? new Date(post.publishedDate).toISOString()
        : "";

    articles.push({
      id: articleId(absolute),
      title: post.title.trim(),
      url: normalizeUrl(absolute),
      source: "canva",
      publishedAt,
      tags: resolveTags(post.tags ?? [], "canva"),
      summary: summarize(post.abstract ?? ""),
      fetchedAt,
    });
  }

  return { articles, nextUrl: null };
}

export const canva: Source = {
  id: "canva",
  name: "Canva Engineering",
  fetch: () => fetchRss("https://www.canva.dev/blog/engineering/feed.xml", "canva"),
  backfill: () => crawlArchive("https://www.canva.dev/blog/engineering/", parseCanvaArchivePage),
};
