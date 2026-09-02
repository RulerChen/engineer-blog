import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { iconHost, iconKey, parseIconFile } from "../src/lib/icon.js";
import { readEntries } from "./readEntries.js";

const ICON_DIR = fileURLToPath(new URL("../public/icons/", import.meta.url));

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

const ICONIFY = "https://api.iconify.design/logos";
const SVGL = "https://api.svgl.app";

interface SvglEntry {
  title?: string;
  route?: string | { light?: string; dark?: string };
}

/** A brand's drawn mark: one file, or two when the mark is monochrome. */
interface Brand {
  light: Icon;
  dark?: Icon;
}

/** Width over height of the viewBox — the only shape an SVG commits to. */
function aspect(svg: string): number | null {
  const box = /viewBox\s*=\s*"([^"]+)"/i
    .exec(svg)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box?.length !== 4 || !box[3] || Number.isNaN(box[2]) || Number.isNaN(box[3])) return null;
  return box[2] / box[3];
}

/**
 * Whether the mark carries a colour that reads on both a near-white and a
 * near-black card. A logo drawn only in white (svgl ships Notion that way) or
 * only in black is a one-theme file wearing a neutral name; taking it would
 * make it vanish on the other theme, where the site's own favicon — which
 * comes with its own plate — still shows.
 */
function readsOnEitherTheme(svg: string): boolean {
  for (const [, hex] of svg.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (luma > 0.12 && luma < 0.88) return true;
  }
  return false;
}

/**
 * Whether the mark is close enough to square to survive a 34px box. Wordmarks
 * are the thing this turns away: Uber's is 2.9 times as wide as it is tall and
 * would land on the card as a smear.
 */
function fitsTheBox(svg: string): boolean {
  const ratio = aspect(svg);
  return ratio === null || (ratio >= 0.55 && ratio <= 1.8);
}

/**
 * Whether a vector file can go on the card as it is: the right shape, and ink
 * that reads against either theme's card.
 */
function usableMark(icon: Icon): boolean {
  if (icon.ext !== ".svg") return false;
  const svg = new TextDecoder().decode(icon.bytes);
  return fitsTheBox(svg) && readsOnEitherTheme(svg);
}

/**
 * Iconify's `logos` set — around 1800 hand-drawn brand marks, and the first
 * place to ask because its names carry the distinction we need: `x-icon` is the
 * square mark, plain `x` is usually the wordmark. Names are looked up directly
 * rather than searched, so a company it has never heard of is a 404 rather than
 * a confident wrong answer.
 */
async function iconifyIcon(source: string): Promise<Brand | null> {
  const slug = iconKey(source);
  if (!slug) return null;
  for (const name of [`${slug}-icon`, slug]) {
    const light = await download(`${ICONIFY}/${name}.svg`).catch(() => null);
    if (light && usableMark(light)) return { light };
  }
  return null;
}

/**
 * svgl, asked second because it is the only one of the two that ships a
 * monochrome mark as a light/dark pair — which is the whole of what GitHub,
 * OpenAI and Cursor have to offer.
 *
 * Matched on the source name exactly: svgl's search is a substring match that
 * answers "Uber" with Kubernetes first.
 */
async function svglIcon(source: string): Promise<Brand | null> {
  const res = await get(`${SVGL}?search=${encodeURIComponent(source)}`).catch(() => null);
  if (!res?.ok) return null;
  const body: unknown = await res.json().catch(() => null);
  const hit = Array.isArray(body)
    ? (body as SvglEntry[]).find((e) => e.title?.toLowerCase() === source.toLowerCase())
    : undefined;
  const route = hit?.route;
  if (!route) return null;

  const paths = typeof route === "string" ? { light: route } : route;
  if (!paths.light) return null;
  const light = await download(paths.light).catch(() => null);
  if (light?.ext !== ".svg") return null;

  const svg = new TextDecoder().decode(light.bytes);
  if (!fitsTheBox(svg)) return null;

  const darkPath = paths.dark && paths.dark !== paths.light ? paths.dark : null;
  const dark = darkPath ? await download(darkPath).catch(() => null) : null;
  if (dark?.ext === ".svg") return { light, dark };
  return readsOnEitherTheme(svg) ? { light } : null;
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

/** Source keys that already have a file, whatever extension or theme it was saved under. */
async function cached(): Promise<Set<string>> {
  const files = await readdir(ICON_DIR).catch(() => [] as string[]);
  return new Set(files.flatMap((file) => parseIconFile(file)?.key ?? []));
}

async function main(): Promise<void> {
  const inputs = await readEntries();
  // One company, one icon — plus the host it was first seen writing on, which is
  // where we look when svgl has never heard of it. A company that publishes on a
  // platform (Airbnb on medium.com) gets the platform's logo out of that, which
  // is wrong but visible: drop the right file in public/icons/ under the source
  // key and it is never fetched again.
  const sources = new Map<string, { name: string; host: string }>();
  for (const input of inputs) {
    const key = iconKey(input.source);
    const host = iconHost(input.url);
    if (key && host && input.source && !sources.has(key)) {
      sources.set(key, { name: input.source, host });
    }
  }

  await mkdir(ICON_DIR, { recursive: true });
  const have = await cached();
  const missing = [...sources].filter(([key]) => !have.has(key));
  if (missing.length === 0) {
    console.log(`icons: ${sources.size} sources, all cached`);
    return;
  }

  let written = 0;
  for (const [key, { name, host }] of missing) {
    // The site's own SVG wins outright: it is the brand's own answer to exactly
    // this question, plate and all. A brand set holds the bare mark, which for
    // some companies means nothing without the plate around it — Stripe's is a
    // solid parallelogram that reads as a purple smudge on its own, which is why
    // its file here is hand-placed: stripe.dev stopped serving the vector.
    //
    // A raster favicon gets no such deference. It is whatever size the site
    // chose, and four of ours came back at 32px, so the brand sets go first:
    // Iconify, which names the square mark outright, then svgl, which is the
    // one that ships a monochrome mark as a light/dark pair.
    const own = await fetchIcon(host).catch(() => null);
    let brand: Brand | null = null;
    let from = host;
    if (!(own && usableMark(own))) {
      for (const [label, ask] of [
        ["iconify", iconifyIcon],
        ["svgl", svglIcon],
      ] as const) {
        brand = await ask(name).catch(() => null);
        if (brand) {
          from = brand.dark ? `${label} (light+dark)` : label;
          break;
        }
      }
    }
    const icon = brand?.light ?? own;
    if (!icon) {
      // Not fatal: the card falls back to the lettered avatar, and a hand-placed
      // file in public/icons/ overrides this script for good on the next run.
      console.warn(`icons: no icon found for ${key} (${host})`);
      continue;
    }
    await writeFile(join(ICON_DIR, `${key}${icon.ext}`), icon.bytes);
    // A monochrome mark needs its second copy; `.dark` is the suffix readIcons pairs on.
    if (brand?.dark)
      await writeFile(join(ICON_DIR, `${key}.dark${brand.dark.ext}`), brand.dark.bytes);
    console.log(`icons: ${key} <- ${from}`);
    written++;
  }
  console.log(`icons: fetched ${written}/${missing.length} new`);
}

main().catch((error: unknown) => {
  // An offline or flaky run must not stop a build; the cards fall back on their own.
  console.warn("icons: skipped —", error instanceof Error ? error.message : error);
});
