import { type Ref, ref } from "vue";
import type { Corpus } from "./corpus.js";
import type { Article } from "../types.js";

export interface CorpusData {
  entries: Ref<Article[]>;
  loading: Ref<boolean>;
  failed: Ref<boolean>;
}

/**
 * Each corpus file, fetched once for the life of the page and kept.
 *
 * The views mount and unmount as the header switches between them, so a fetch
 * owned by a view is a fetch that happens every time you switch. What the reader
 * saw was the page collapsing to one line of "Loading…" and springing back —
 * the second switch is now instant and draws no loading state at all.
 */
const loaded = new Map<Corpus, CorpusData>();

export function useCorpusData(corpus: Corpus): CorpusData {
  const cached = loaded.get(corpus);
  if (cached) return cached;
  const data: CorpusData = { entries: ref([]), loading: ref(true), failed: ref(false) };
  loaded.set(corpus, data);
  void load(corpus, data);
  return data;
}

async function load(corpus: Corpus, data: CorpusData): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}${corpus}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.entries.value = (await res.json()) as Article[];
  } catch {
    data.failed.value = true;
    // A failed corpus is not cached as failed for ever: drop it so the next
    // mount tries again, which is what a reader switching back would expect.
    loaded.delete(corpus);
  } finally {
    data.loading.value = false;
  }
}
