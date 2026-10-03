// Fetches a mark for every blog source that has no file in public/icons/ yet; a hand-placed file always wins.
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { iconKey, parseIconFile } from "../src/shared/icon.js";
import { isBlogEntry } from "./lib/articles.js";
import { ICON_DIR } from "./lib/paths.js";
import { readEntries } from "./lib/read.js";

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

/** The entry's hostname without `www.`, which is where a source with no brand-set mark is looked up. */
function iconHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Ranks a declared icon before spending a request on it; only the extension is trusted, since sites mislabel types. */
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

/** Width off a PNG's IHDR header, the one format worth decoding here. */
function pngWidth(bytes: Uint8Array): number | null {
  if (bytes.byteLength < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(16);
}

/** Worth as a 42px avatar: vector wins, `.ico` is assumed 16px, an undecoded raster gets the benefit of the doubt. */
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

/** Width over height of the viewBox, the only shape an SVG commits to. */
function aspect(svg: string): number | null {
  const box = /viewBox\s*=\s*"([^"]+)"/i
    .exec(svg)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box?.length !== 4 || !box[3] || Number.isNaN(box[2]) || Number.isNaN(box[3])) return null;
  return box[2] / box[3];
}

/** A mark drawn only in white or only in black is a one-theme file and would vanish on the other theme. */
function readsOnEitherTheme(svg: string): boolean {
  for (const [, hex] of svg.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (luma > 0.12 && luma < 0.88) return true;
  }
  return false;
}

/** Turns away wordmarks, which land in a 34px box as a smear. */
function fitsTheBox(svg: string): boolean {
  const ratio = aspect(svg);
  return ratio === null || (ratio >= 0.55 && ratio <= 1.8);
}

function usableMark(icon: Icon): boolean {
  if (icon.ext !== ".svg") return false;
  const svg = new TextDecoder().decode(icon.bytes);
  return fitsTheBox(svg) && readsOnEitherTheme(svg);
}

/** Iconify's `logos` set, looked up by name so an unknown company is a 404, not a confident wrong answer. */
async function iconifyIcon(source: string): Promise<Brand | null> {
  const slug = iconKey(source);
  if (!slug) return null;
  // `x-icon` is the square mark; plain `x` is usually the wordmark.
  for (const name of [`${slug}-icon`, slug]) {
    const light = await download(`${ICONIFY}/${name}.svg`).catch(() => null);
    if (light && usableMark(light)) return { light };
  }
  return null;
}

/** svgl, the only source that ships a monochrome mark as a light/dark pair; matched exactly, since its search is a substring match. */
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

/** The site's declared icons, the two conventional paths, then Google's service; a small one is held while the rest are tried. */
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

/** Whether the host is the source's own site, not a publisher like usenix.org whose logo would look deliberate. */
function ownSite(host: string, key: string): boolean {
  return host.split(".").some((label) => iconKey(label) === key);
}

/** Source keys that already have a file, whatever extension or theme it was saved under. */
async function cached(): Promise<Set<string>> {
  const files = await readdir(ICON_DIR).catch(() => [] as string[]);
  return new Set(files.flatMap((file) => parseIconFile(file)?.key ?? []));
}

async function main(): Promise<void> {
  const inputs = (await readEntries()).filter(isBlogEntry);
  // One company, one icon, looked up on the first host it was seen on; a platform host gives a wrong but visible logo.
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
    // The site's own usable SVG wins outright; otherwise the brand sets beat a raster favicon of whatever size.
    const own = ownSite(host, key) ? await fetchIcon(host).catch(() => null) : null;
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
      // Not fatal: the card letters the avatar instead.
      console.warn(`icons: no icon found for ${key} (${host})`);
      continue;
    }
    await writeFile(join(ICON_DIR, `${key}${icon.ext}`), icon.bytes);
    // `.dark` is the suffix readIcons pairs on.
    if (brand?.dark)
      await writeFile(join(ICON_DIR, `${key}.dark${brand.dark.ext}`), brand.dark.bytes);
    console.log(`icons: ${key} <- ${from}`);
    written++;
  }
  console.log(`icons: fetched ${written}/${missing.length} new`);
}

main().catch((error: unknown) => {
  // An offline or flaky run must not stop a build; the cards fall back on their own.
  console.warn("icons: skipped:", error instanceof Error ? error.message : error);
});
