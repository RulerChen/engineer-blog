import type { Article } from "./types.js";

/** Schema check per spec: valid absolute http(s) URL, non-empty title, parseable date. */
export function articleErrors(article: Article): string[] {
  const errors: string[] = [];
  if (!article.title || article.title.trim() === "") errors.push("empty title");
  try {
    const url = new URL(article.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.push("url not http(s)");
    }
  } catch {
    errors.push("invalid url");
  }
  if (Number.isNaN(Date.parse(article.publishedAt))) {
    errors.push("unparseable publishedAt");
  }
  return errors;
}

export function filterValid(
  articles: Article[],
  onDrop: (article: Article, errors: string[]) => void = (article, errors) =>
    console.warn(`dropping ${article.url || "<no url>"}: ${errors.join(", ")}`),
): Article[] {
  return articles.filter((article) => {
    const errors = articleErrors(article);
    if (errors.length > 0) {
      onDrop(article, errors);
      return false;
    }
    return true;
  });
}
