import * as cheerio from "cheerio";
import type { ArchivePage, CrawlOpts } from "../src/backfill.js";
import { crawlArchive } from "../src/backfill.js";
import { USER_AGENT } from "../src/http.js";
import { articleId, normalizeUrl } from "../src/normalize.js";
import { summarize } from "../src/sanitize.js";
import { resolveTags } from "../src/tags.js";
import type { Article, Source } from "../src/types.js";

const LISTING_URL = "https://www.atlassian.com/blog/how-we-build";

/**
 * Atlassian's old dedicated engineering blog is gone: `blog.developer.
 * atlassian.com` now just 302s to `atlassianblog.wpengine.com` (the same WP
 * host behind the general company blog), and `atlassian.com/engineering`
 * / `atlassian.com/engineering/blog` both 301 straight to the general
 * "Inside Atlassian" blog (`atlassian.com/blog/`) — there is no longer a
 * standalone engineering-only property. What remains closest to one is the
 * blog's "How We Build" topic/category (`/blog/how-we-build`), which is
 * where Atlassian actually publishes its engineering content (e.g.
 * "Streaming Server-Side Rendering in Confluence", "Architecting Scalable
 * ML Platforms", "Optimisation Tools for Jira", "Bitbucket merge queues"),
 * alongside some adjacent product/design/people-craft posts under the same
 * topic. This is used as the practical "Atlassian Engineering" source.
 *
 * `/blog/how-we-build` has no dedicated RSS feed of its own (`/feed` on
 * that path 404s; the whole-blog `/blog/feed` is real but is every category
 * mixed together, mostly product/marketing content with no reliable way to
 * filter to just this topic). The topic listing page itself *is* real,
 * paginated (`/blog/how-we-build/page/N`, currently 11 pages deep, reaching
 * back to at least mid-2024), but — like Notion's `/blog/topic/tech` and
 * Discord's `/category/engineering` — carries no publish date anywhere on
 * its cards. Each individual post page does carry one, in a WordPress/Yoast
 * `Article` JSON-LD block nested inside a top-level `@graph` array (a
 * different shape from Notion/Discord's flat top-level `Article` object),
 * with a `datePublished` field mirrored in a `<time datetime>` element.
 *
 * So, like Notion/Discord, this is a two-stage crawl: `parseAtlassianListingPage`
 * (via `crawlArchive`) collects title/url/summary/tag from the
 * topic listing, then `fetchAtlassianArchive` makes one additional,
 * sequential, delayed request per post to read its real publish date from
 * the JSON-LD block. Posts whose date can't be resolved are dropped.
 *
 * Selectors match the captured fixture (atlassian.com/blog/how-we-build):
 * - Each post is a `div.rkv-card`.
 * - Title + link: `a.rkv-card-link`, whose `href` is the post URL and whose
 *   `aria-label` holds the exact title (the `<h3 class="rkv-card-title">`
 *   text is identical but sits as a sibling, not inside the link).
 * - Summary: `p.description`.
 * - Category/tag: `a.term-lozenge` (e.g. "How We Build").
 * - Next page: `a.next-link` inside `.rkv-curator-pagination`; absent on
 *   the last page.
 */
export function parseAtlassianListingPage(html: string, pageUrl: string): ArchivePage {
  const $ = cheerio.load(html);
  const fetchedAt = new Date().toISOString();
  const articles: Article[] = [];
  $("div.rkv-card").each((_i, el) => {
    const card = $(el);
    const link = card.find("a.rkv-card-link").first();
    const href = link.attr("href");
    const title =
      link.attr("aria-label")?.trim() || card.find("h3.rkv-card-title").first().text().trim();
    if (!href || !title) return;

    const absolute = new URL(href, pageUrl).toString();
    const summary = card.find("p.description").first().text().trim();
    const tags = card
      .find("a.term-lozenge")
      .map((_j, tag) => $(tag).text().trim())
      .get()
      .filter(Boolean);

    articles.push({
      id: articleId(absolute),
      title,
      url: normalizeUrl(absolute),
      source: "atlassian",
      publishedAt: "", // not available on the listing page; filled in by fetchAtlassianArchive
      tags: resolveTags(tags, "atlassian"),
      summary: summarize(summary),
      fetchedAt,
    });
  });
  const next = $(".rkv-curator-pagination a.next-link").first().attr("href");
  const nextUrl = next ? new URL(next, pageUrl).toString() : null;
  return { articles, nextUrl };
}

/**
 * Extracts `datePublished` from an Atlassian post page's `Article` JSON-LD
 * block, nested inside Yoast's top-level `@graph` array.
 */
export function extractAtlassianPublishedAt(html: string): string {
  const $ = cheerio.load(html);
  let publishedAt = "";
  $('script[type="application/ld+json"]').each((_i, el) => {
    if (publishedAt) return;
    try {
      const data: unknown = JSON.parse($(el).contents().text());
      if (!data || typeof data !== "object") return;
      const graph = (data as Record<string, unknown>)["@graph"];
      const nodes = Array.isArray(graph) ? graph : [data];
      for (const node of nodes) {
        if (
          node &&
          typeof node === "object" &&
          (node as Record<string, unknown>)["@type"] === "Article"
        ) {
          const datePublished = (node as Record<string, unknown>).datePublished;
          if (typeof datePublished === "string" && !Number.isNaN(Date.parse(datePublished))) {
            publishedAt = new Date(datePublished).toISOString();
            return;
          }
        }
      }
    } catch {
      // not JSON, or not the block we want — skip
    }
  });
  return publishedAt;
}

/**
 * Crawls the Atlassian "How We Build" topic listing, then enriches each
 * post with its real publish date by fetching the post page itself (see
 * module docs). Requests are sequential with a polite delay, mirroring
 * `crawlArchive`.
 */
async function fetchAtlassianArchive(opts: CrawlOpts = {}): Promise<Article[]> {
  const { delayMs = 1500, fetchImpl = fetch } = opts;
  const listed = await crawlArchive(LISTING_URL, parseAtlassianListingPage, opts);
  const enriched: Article[] = [];
  for (let i = 0; i < listed.length; i++) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const article = listed[i];
    try {
      const res = await fetchImpl(article.url, { headers: { "user-agent": USER_AGENT } });
      if (!res.ok) continue;
      const publishedAt = extractAtlassianPublishedAt(await res.text());
      if (publishedAt) enriched.push({ ...article, publishedAt });
    } catch {
      // skip posts whose detail page fails to fetch or parse
    }
  }
  return enriched;
}

export const atlassian: Source = {
  id: "atlassian",
  name: "Atlassian Engineering",
  fetch: () => fetchAtlassianArchive({ maxPages: 1 }),
  backfill: () => fetchAtlassianArchive(),
};
