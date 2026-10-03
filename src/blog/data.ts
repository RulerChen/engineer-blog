import { type JsonData, useJson } from "../app/fetchJson.js";
import type { Article } from "../shared/entry.js";

/** The blog list, newest first; papers are reached only through roadmaps. */
export function useArticles(): JsonData<Article[]> {
  return useJson<Article[]>("articles.json", []);
}
