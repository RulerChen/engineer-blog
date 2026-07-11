import type { Article } from "../src/types.js";
import { articleId } from "./articleId.js";

/** Shape of a hand-written entry in data/manual.json — id is auto-derived from url. */
export interface ManualArticleInput {
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
  tags?: string[];
  summary?: string;
  thumbnail?: string | null;
  fetchedAt?: string;
}

export function toArticle(input: ManualArticleInput): Article {
  return {
    id: articleId(input.url),
    title: input.title,
    url: input.url,
    source: input.source ?? "manual",
    publishedAt: input.publishedAt,
    tags: input.tags ?? [],
    summary: input.summary ?? "",
    thumbnail: input.thumbnail ?? null,
    fetchedAt: input.fetchedAt ?? input.publishedAt,
  };
}
