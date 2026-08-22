/**
 * URL normalization shared by the browser (duplicate detection in the entry
 * form) and the build script (stable id hashing). Must stay dependency-free so
 * it can be bundled for the browser.
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

/** Same normalization, but returns null instead of throwing on a bad url. */
export function tryNormalizeUrl(raw: string): string | null {
  try {
    return normalizeUrl(raw);
  } catch {
    return null;
  }
}
