import { appendFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getSource, sources } from "../sources/index.js";
import { allFailed, renderSummary, runSources, totalAdded } from "./run.js";
import { readSourceArticles, writeSourceArticles } from "./storage.js";
import { unmappedTags } from "./tags.js";

const dataDir = fileURLToPath(new URL("../../data/articles/", import.meta.url));
const unmappedTagsPath = fileURLToPath(new URL("../../data/unmapped-tags.json", import.meta.url));
const [, , mode, sourceId] = process.argv;

if (mode !== "fetch" && mode !== "backfill") {
  console.error("usage: cli.ts fetch | cli.ts backfill <source-id>");
  process.exit(2);
}

let selected = sources;
if (mode === "backfill") {
  const source = sourceId ? getSource(sourceId) : undefined;
  if (!source) {
    console.error(`unknown source "${sourceId}". known: ${sources.map((s) => s.id).join(", ")}`);
    process.exit(2);
  }
  selected = [source];
}

const results = await runSources(selected, mode, {
  read: (id) => readSourceArticles(dataDir, id),
  write: (id, articles) => writeSourceArticles(dataDir, id, articles),
});

const summary = renderSummary(results);
console.log(summary);

const unmapped = unmappedTags.list();
if (unmapped.length > 0) {
  console.warn(
    `WARN ${unmapped.length} unmapped tag(s) dropped — see ${unmappedTagsPath}:\n` +
      unmapped.map((u) => `  ${u.source}: "${u.raw}" (x${u.count})`).join("\n"),
  );
  await writeFile(unmappedTagsPath, JSON.stringify(unmapped, null, 2) + "\n", "utf8");
}
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Fetch results\n\n${summary}\n`);
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `added=${totalAdded(results)}\n`);
}
if (allFailed(results)) {
  console.error("all sources failed");
  process.exit(1);
}
