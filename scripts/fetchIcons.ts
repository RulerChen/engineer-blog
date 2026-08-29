import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EntryInput } from "../src/lib/entry.js";
import { iconDomain } from "../src/lib/icon.js";

const ICON_DIR = fileURLToPath(new URL("../public/icons/", import.meta.url));
const ENTRIES = fileURLToPath(new URL("../data/entries.json", import.meta.url));

/** Sites serve favicons to browsers; a bare fetch gets a 403 from more than a few. */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const TIMEOUT_MS = 10_000;

const EXTENSIONS: Record<string, string> = {
  "image/svg+xml": ".svg",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

function get(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "user-agent": UA, accept: "*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * How good a declared icon looks before we spend a request on it. Bigger is
 * better and vector is effectively unbounded; `.ico` loses to anything else,
 * being either the 16px legacy file or a multi-resolution bundle far heavier
 * than a 42px avatar has any use for. Only the extension is trusted for that —
 * sites routinely declare `type="image/x-icon"` on a PNG.
 */
function score(rel: string, href: string, sizes: string, type: string): number {
  if (/\.svg($|\?)/i.test(href) || type === "image/svg+xml") return 1000;
  const declared = /(\d+)x\d+/i.exec(sizes);
  let value = declared ? Number(declared[1]) : 32;
  if (rel.includes("apple-touch-icon")) value += 64;
  if (/\.ico($|\?)/i.test(href)) value -= 128;
  return value;
}

function attribute(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
}

/** Declared `<link rel="...icon">` hrefs, best-looking first, resolved against the page. */
function declaredIcons(html: string, pageUrl: string): string[] {
  const candidates: { href: string; rank: number }[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attribute(tag, "rel").toLowerCase();
    if (!rel.includes("icon")) continue;
    const href = attribute(tag, "href");
    if (!href || href.startsWith("data:")) continue;
    try {
      candidates.push({
        href: new URL(href, pageUrl).href,
        rank: score(rel, href, attribute(tag, "sizes"), attribute(tag, "type").toLowerCase()),
      });
    } catch {
      // A malformed href is one candidate lost, not a reason to give up on the site.
    }
  }
  return candidates.toSorted((a, b) => b.rank - a.rank).map((c) => c.href);
}

interface Icon {
  bytes: Uint8Array;
  ext: string;
  /** Pixel width, when the format makes it cheap to read. */
  width: number | null;
}

/** Width off a PNG's IHDR header — the one format worth decoding here, and the common one. */
function pngWidth(bytes: Uint8Array): number | null {
  if (bytes.byteLength < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(16);
}

/**
 * How much an icon is worth as a 42px avatar. Vector wins outright, a known
 * width speaks for itself, `.ico` is assumed to be the 16px legacy file, and an
 * undecoded raster gets the benefit of the doubt without beating a measured one.
 */
function quality(icon: Icon): number {
  if (icon.ext === ".svg") return 1024;
  return icon.width ?? (icon.ext === ".ico" ? 16 : 48);
}

/** Downloads one candidate, or null if it isn't reachable and isn't an image. */
async function download(url: string): Promise<Icon | null> {
  const res = await get(url).catch(() => null);
  if (!res?.ok) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  // Plenty of sites answer a missing icon with their 200-OK HTML error page.
  if (!type.startsWith("image/")) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) return null;
  const ext = EXTENSIONS[type] ?? /(\.[a-z0-9]+)(?:$|\?)/i.exec(new URL(url).pathname)?.[1];
  return ext ? { bytes, ext: ext.toLowerCase(), width: pngWidth(bytes) } : null;
}

/**
 * The best icon a domain will give us: what its home page declares, then the
 * two conventional paths, then Google's favicon service as a last resort. The
 * service is only ever called here at build time, so no visitor is exposed to it.
 *
 * Candidates are tried in order but not taken on sight: plenty of sites declare
 * only a 32px favicon, which is half of what a 26px avatar needs on a retina
 * screen, so a small one is held as a fallback while the rest are tried.
 */
async function fetchIcon(domain: string): Promise<Icon | null> {
  const origin = `https://${domain}/`;
  const page = await get(origin).catch(() => null);
  const declared = page?.ok ? declaredIcons(await page.text(), page.url) : [];
  const candidates = [
    ...declared,
    `${origin}apple-touch-icon.png`,
    `${origin}favicon.ico`,
    `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`,
  ];
  let best: Icon | null = null;
  for (const url of candidates) {
    const icon = await download(url).catch(() => null);
    if (!icon) continue;
    if (quality(icon) >= 64) return icon;
    if (!best || quality(icon) > quality(best)) best = icon;
  }
  return best;
}

/** Domains that already have a file, whatever extension it was saved under. */
async function cached(): Promise<Set<string>> {
  const files = await readdir(ICON_DIR).catch(() => [] as string[]);
  return new Set(files.map((file) => file.replace(/\.[^.]+$/, "")));
}

async function main(): Promise<void> {
  const inputs = JSON.parse(await readFile(ENTRIES, "utf8")) as EntryInput[];
  const domains = new Set<string>();
  for (const input of inputs) {
    const domain = iconDomain(input.url);
    if (domain) domains.add(domain);
  }

  await mkdir(ICON_DIR, { recursive: true });
  const have = await cached();
  const missing = [...domains].filter((domain) => !have.has(domain));
  if (missing.length === 0) {
    console.log(`icons: ${domains.size} domains, all cached`);
    return;
  }

  let written = 0;
  for (const domain of missing) {
    const icon = await fetchIcon(domain).catch(() => null);
    if (!icon) {
      // Not fatal: the card falls back to the lettered avatar, and a hand-placed
      // file in public/icons/ overrides this script for good on the next run.
      console.warn(`icons: no icon found for ${domain}`);
      continue;
    }
    await writeFile(join(ICON_DIR, `${domain}${icon.ext}`), icon.bytes);
    written++;
  }
  console.log(`icons: fetched ${written}/${missing.length} new`);
}

main().catch((error: unknown) => {
  // An offline or flaky run must not stop a build; the cards fall back on their own.
  console.warn("icons: skipped —", error instanceof Error ? error.message : error);
});
