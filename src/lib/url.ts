/**
 * URL normalization, used by the build script for stable id hashing. Kept
 * dependency-free so it can be bundled for the browser too.
 */

/** Lowercase host, strip fragment, strip trailing slash; query kept as-is. */
export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.host = url.host.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}
