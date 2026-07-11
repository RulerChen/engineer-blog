import { USER_AGENT } from "./http.js";
import type { Article } from "./types.js";

export interface ArchivePage {
  articles: Article[];
  nextUrl: string | null;
}

export interface CrawlOpts {
  delayMs?: number;
  maxPages?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Sequential archive crawler: one request at a time, a polite delay between
 * pages, an honest User-Agent, and a hard page cap as a runaway guard.
 */
export async function crawlArchive(
  startUrl: string,
  parsePage: (html: string, pageUrl: string) => ArchivePage,
  opts: CrawlOpts = {},
): Promise<Article[]> {
  const { delayMs = 1500, maxPages = 200, fetchImpl = fetch } = opts;
  const all: Article[] = [];
  let url: string | null = startUrl;
  for (let page = 0; url !== null && page < maxPages; page++) {
    if (page > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const res = await fetchImpl(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const { articles, nextUrl } = parsePage(await res.text(), url);
    all.push(...articles);
    url = nextUrl;
  }
  return all;
}
