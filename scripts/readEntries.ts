import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EntryInput } from "../src/lib/entry.js";
import { normalizeEntryType } from "../src/lib/entryType.js";

/** Where the per-company entry files live — one `data/<source>.json` each. */
export const DATA_DIR = fileURLToPath(new URL("../data/", import.meta.url));

/**
 * Every entry on disk, read out of the per-company files in data/. The
 * directory listing is the manifest, the same way public/icons/ is: adding a
 * company means dropping in one more file, with nowhere else to register it.
 * Read in sorted order so the concatenation is stable, but nothing downstream
 * leans on it — buildArticles dedupes by url and sorts by date. The files
 * themselves are kept newest-first for the diffs' sake, not for this.
 */
export async function readEntries(dir = DATA_DIR): Promise<EntryInput[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).toSorted();
  const groups = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(join(dir, file), "utf8")) as EntryInput[]),
  );
  return groups.flat();
}

/**
 * Whether the entry came from a blog the list scans, as opposed to a paper.
 * Icons and the README logo strip are built from blogs only: a paper's source is
 * the institution that wrote it, not a feed with a mark of its own, and 21 of the
 * 26 sources that appear on papers alone are universities that never will have
 * one. A company that publishes papers but no blog gets its icon hand-dropped
 * into public/icons/, the same way a company whose favicon looks bad does.
 */
export function isBlogEntry(entry: EntryInput): boolean {
  return normalizeEntryType(entry.type) !== "paper";
}
