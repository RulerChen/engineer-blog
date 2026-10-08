import { ref } from "vue";
import { type JsonData, useJson } from "../app/fetchJson.js";
import type { Article } from "../shared/entry.js";

/** How many entries the blog page's list shows, for the header's count; null while there is no list. */
export const shownCount = ref<number | null>(null);

/** The blog list, newest first; papers are reached only through roadmaps. */
export function useArticles(): JsonData<Article[]> {
  return useJson<Article[]>("articles.json", []);
}
