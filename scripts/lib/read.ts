import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { EntryInput } from "../../src/shared/entry.js";
import { parseIconFile } from "../../src/shared/icon.js";
import type { RoadmapInput } from "../../src/shared/roadmap.js";
import { DATA_DIR, ICON_DIR, ROADMAP_DIR } from "./paths.js";

async function jsonFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  return files.filter((file) => file.endsWith(".json")).toSorted();
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

/** Every entry in data/, in file order; buildArticles dedupes and sorts, so nothing leans on that order. */
export async function readEntries(dir = DATA_DIR): Promise<EntryInput[]> {
  const files = await jsonFiles(dir);
  const groups = await Promise.all(files.map((file) => readJson<EntryInput[]>(join(dir, file))));
  return groups.flat();
}

export async function readRoadmaps(dir = ROADMAP_DIR): Promise<RoadmapInput[]> {
  const files = await jsonFiles(dir);
  return Promise.all(files.map((file) => readJson<RoadmapInput>(join(dir, file))));
}

/** The one or two files a company's mark is drawn across. */
export interface IconFiles {
  light: string;
  dark?: string;
}

/** Source key to its icon files, read off the directory listing. */
export async function readIcons(dir = ICON_DIR): Promise<Map<string, IconFiles>> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const icons = new Map<string, Partial<IconFiles>>();
  for (const file of files.toSorted()) {
    const parsed = parseIconFile(file);
    if (!parsed) continue;
    const entry = icons.get(parsed.key) ?? {};
    entry[parsed.dark ? "dark" : "light"] = file;
    icons.set(parsed.key, entry);
  }
  // A lone `x.dark.svg` is half a pair and reads on neither theme on its own.
  return new Map(
    [...icons].flatMap(([key, entry]) => (entry.light ? [[key, entry as IconFiles] as const] : [])),
  );
}
