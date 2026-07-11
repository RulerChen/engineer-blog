import { filterExcluded } from "./exclude.js";
import { merge } from "./merge.js";
import type { Article, Source } from "./types.js";
import { filterValid } from "./validate.js";

export interface SourceResult {
  id: string;
  status: "ok" | "failed" | "guarded";
  fetched: number;
  added: number;
  error?: string;
}

export interface RunDeps {
  read(sourceId: string): Promise<Article[]>;
  write(sourceId: string, articles: Article[]): Promise<void>;
  log?(msg: string): void;
}

/** Per-source isolation: one failure never stops the run or touches that source's data. */
export async function runSources(
  sourceList: Source[],
  mode: "fetch" | "backfill",
  deps: RunDeps,
  excluded: Set<string> = new Set(),
): Promise<SourceResult[]> {
  const log = deps.log ?? ((msg: string) => console.error(msg));
  const results: SourceResult[] = [];
  for (const source of sourceList) {
    try {
      const strategy = mode === "backfill" ? source.backfill : source.fetch;
      if (!strategy) throw new Error(`source ${source.id} has no ${mode} strategy`);
      const fetchedRaw = filterValid(await strategy(), (article, errors) =>
        log(`WARN ${source.id}: dropping ${article.url || "<no url>"}: ${errors.join(", ")}`),
      );
      const existingRaw = await deps.read(source.id);
      if (fetchedRaw.length === 0 && existingRaw.length > 0) {
        log(
          `WARN ${source.id}: previously healthy source returned 0 articles; keeping existing data`,
        );
        results.push({ id: source.id, status: "guarded", fetched: 0, added: 0 });
        continue;
      }
      // Excluded articles are dropped from both sides so they neither get re-added
      // nor linger in the stored archive once excluded.
      const fetched = filterExcluded(fetchedRaw, excluded);
      const existing = filterExcluded(existingRaw, excluded);
      const merged = merge(existing, fetched);
      await deps.write(source.id, merged);
      results.push({
        id: source.id,
        status: "ok",
        fetched: fetched.length,
        added: merged.length - existing.length,
      });
    } catch (err) {
      log(`ERROR ${source.id}: ${String(err)}`);
      results.push({ id: source.id, status: "failed", fetched: 0, added: 0, error: String(err) });
    }
  }
  return results;
}

/** The workflow goes red only when every source failed. */
export function allFailed(results: SourceResult[]): boolean {
  return results.length > 0 && results.every((r) => r.status === "failed");
}

export function totalAdded(results: SourceResult[]): number {
  return results.reduce((sum, r) => sum + r.added, 0);
}

/** Markdown table for the GitHub Actions job summary. */
export function renderSummary(results: SourceResult[]): string {
  return [
    "| source | status | fetched | added | error |",
    "| --- | --- | --- | --- | --- |",
    ...results.map(
      (r) => `| ${r.id} | ${r.status} | ${r.fetched} | ${r.added} | ${r.error ?? ""} |`,
    ),
  ].join("\n");
}
