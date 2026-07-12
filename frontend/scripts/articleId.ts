import { createHash } from "node:crypto";

// Keep in sync with scraper/src/normalize.ts (single source of truth for the hash).

/** Lowercase host, strip fragment, strip trailing slash; query kept as-is (v1). */
export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.host = url.host.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function articleId(rawUrl: string): string {
  return createHash("sha1").update(normalizeUrl(rawUrl)).digest("hex");
}
