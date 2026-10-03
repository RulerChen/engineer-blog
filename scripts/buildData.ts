// Writes the JSON files the site fetches into public/, refusing entries that break the vocabulary.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ROADMAP_INDEX_FILE } from "../src/shared/roadmap.js";
import { PUBLIC_DIR } from "./lib/paths.js";
import { readEntries } from "./lib/read.js";
import { siteFiles } from "./lib/site.js";
import { entryProblems } from "./lib/validate.js";

const inputs = await readEntries();
const problems = entryProblems(inputs);
if (problems.length) throw new Error(`${problems.length} entry problems:\n${problems.join("\n")}`);

const files = await siteFiles(inputs);
// Cleared first, so a roadmap whose data file was deleted does not linger.
await rm(join(PUBLIC_DIR, dirname(ROADMAP_INDEX_FILE)), { recursive: true, force: true });
for (const [file, body] of files) {
  const path = join(PUBLIC_DIR, file);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(body), "utf8");
}
const articles = files.get("articles.json") as unknown[];
const roadmaps = files.get(ROADMAP_INDEX_FILE) as string[];
console.log(`wrote ${articles.length} entries and ${roadmaps.length} roadmaps`);
