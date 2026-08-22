import { createHash } from "node:crypto";
import { normalizeUrl } from "../src/lib/url.js";

/** Stable per-entry id: sha1 of the normalized url. Build-time only (node:crypto). */
export function articleId(rawUrl: string): string {
  return createHash("sha1").update(normalizeUrl(rawUrl)).digest("hex");
}
