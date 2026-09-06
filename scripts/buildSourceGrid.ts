import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { iconKey } from "../src/lib/icon.js";
import { readIcons } from "./buildEntries.js";
import { readEntries } from "./readEntries.js";

/**
 * The logo strip at the top of the README, built from the same two directories
 * the site is built from — data/ says which companies are on the list, and
 * public/icons/ holds their marks. Hand-drawing it would mean a grid that
 * silently stops matching the list the first time a company is added.
 */

const COLUMNS = 13;
const CELL = 62;
const ICON = 34;
const PAD = 14;
/* The site's own light palette. The strip carries a background rather than
   sitting transparent because several marks are near-black — GitHub's is
   #1b1f23 — and would disappear against a dark README. */
const BG = "#faf4ea";
const LINE = "#ebdfcc";

/**
 * Every id in an icon lands in the same document once the icons are inlined,
 * and `clip0` is not a name two files can be trusted not to share. Rewritten
 * per cell, along with the references that point at them.
 */
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

/**
 * One icon placed in its cell. An SVG is inlined as a nested `<svg>`, which
 * keeps it as vector markup — a `data:` URI would be an external reference as
 * far as the sandbox GitHub serves raw files under is concerned. A PNG has no
 * such option and goes in as one.
 */
async function cell(dir: string, file: string, index: number, x: number, y: number) {
  const path = join(dir, file);
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
  const root = fileURLToPath(new URL("../", import.meta.url));
  const iconDir = join(root, "public/icons");
  const icons = await readIcons(iconDir);

  const sources = [...new Set((await readEntries()).map((entry) => entry.source ?? ""))]
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
    cells.push(await cell(iconDir, icon.light, index, x, y));
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

  await mkdir(join(root, "assets"), { recursive: true });
  await writeFile(join(root, "assets/sources.svg"), `${svg}\n`, "utf8");
  console.log(`sources grid: ${cells.length} icons in ${rows} rows`);
  if (missing.length > 0) console.log(`  no icon for: ${missing.join(", ")}`);
}

await main();
