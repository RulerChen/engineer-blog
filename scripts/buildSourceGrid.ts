// Draws the README's logo strip from data/ and public/icons/, so it cannot drift from the list; blogs only.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { iconKey } from "../src/shared/icon.js";
import { isBlogEntry } from "./lib/articles.js";
import { ICON_DIR, ROOT_DIR } from "./lib/paths.js";
import { readEntries, readIcons } from "./lib/read.js";

const COLUMNS = 13;
const CELL = 62;
const ICON = 34;
const PAD = 14;
// The site's light palette, opaque because near-black marks like GitHub's would vanish on a dark README.
const BG = "#faf4ea";
const LINE = "#ebdfcc";

/** Inlined icons share one document, so ids like `clip0` are prefixed per cell along with their references. */
function namespaceIds(markup: string, prefix: string): string {
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  let out = markup;
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`\\bid="${escaped}"`, "g"), `id="${prefix}${id}"`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, "g"), `url(#${prefix}${id})`)
      .replace(new RegExp(`href="#${escaped}"`, "g"), `href="#${prefix}${id}"`);
  }
  return out;
}

/** An SVG is nested inline, since GitHub's sandbox treats a data: URI as external; a PNG has no other option. */
async function cell(file: string, index: number, x: number, y: number): Promise<string> {
  const path = join(ICON_DIR, file);
  const box = `x="${x}" y="${y}" width="${ICON}" height="${ICON}"`;
  if (file.endsWith(".png")) {
    const data = (await readFile(path)).toString("base64");
    return `<image ${box} preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${data}"/>`;
  }
  const source = await readFile(path, "utf8");
  const open = /<svg\b[^>]*>/i.exec(source);
  if (!open) throw new Error(`${file}: no <svg> element`);
  const viewBox = /viewBox="([^"]+)"/i.exec(open[0])?.[1] ?? guessViewBox(open[0], file);
  const inner = source
    .slice(open.index + open[0].length, source.lastIndexOf("</svg>"))
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  return `<svg ${box} viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" overflow="visible">${namespaceIds(inner, `i${index}-`)}</svg>`;
}

/** An icon with no viewBox still has width and height to build one from. */
function guessViewBox(open: string, file: string): string {
  const width = /\bwidth="(\d+(?:\.\d+)?)"/i.exec(open)?.[1];
  const height = /\bheight="(\d+(?:\.\d+)?)"/i.exec(open)?.[1];
  if (!width || !height) throw new Error(`${file}: no viewBox and no usable size`);
  return `0 0 ${width} ${height}`;
}

async function main(): Promise<void> {
  const icons = await readIcons();

  const entries = (await readEntries()).filter(isBlogEntry);
  const sources = [...new Set(entries.map((entry) => entry.source ?? ""))]
    .filter(Boolean)
    .toSorted((a, b) => a.localeCompare(b));

  const cells: string[] = [];
  const missing: string[] = [];
  for (const [index, source] of sources.entries()) {
    const key = iconKey(source);
    const icon = key ? icons.get(key) : undefined;
    if (!icon) {
      missing.push(source);
      continue;
    }
    const column = cells.length % COLUMNS;
    const row = Math.floor(cells.length / COLUMNS);
    const x = PAD + column * CELL + (CELL - ICON) / 2;
    const y = PAD + row * CELL + (CELL - ICON) / 2;
    cells.push(await cell(icon.light, index, x, y));
  }

  const rows = Math.ceil(cells.length / COLUMNS);
  const width = PAD * 2 + COLUMNS * CELL;
  const height = PAD * 2 + rows * CELL;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${cells.length} engineering blogs on the list">`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="${BG}" stroke="${LINE}"/>`,
    ...cells,
    `</svg>`,
  ].join("\n");

  await mkdir(join(ROOT_DIR, "assets"), { recursive: true });
  await writeFile(join(ROOT_DIR, "assets/sources.svg"), `${svg}\n`, "utf8");
  console.log(`sources grid: ${cells.length} icons in ${rows} rows`);
  if (missing.length > 0) console.log(`  no icon for: ${missing.join(", ")}`);
}

await main();
