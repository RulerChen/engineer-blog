import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import { useArticleFilter } from "../src/composables/useArticleFilter.js";
import type { Article } from "../src/types.js";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: Math.random().toString(36).slice(2),
    title: "A post",
    url: "https://example.com/post",
    source: "google",
    publishedAt: "2026-07-10T00:00:00.000Z",
    tags: ["ml"],
    summary: "",
    fetchedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  history.replaceState(null, "", "/");
});

describe("useArticleFilter", () => {
  it("filters reactively when state changes", async () => {
    const articles = ref([makeArticle({ title: "GraphQL" }), makeArticle({ title: "Rust" })]);
    const { state, filtered } = useArticleFilter(articles);
    expect(filtered.value).toHaveLength(2);
    state.query = "rust";
    await nextTick();
    expect(filtered.value).toHaveLength(1);
    expect(filtered.value[0].title).toBe("Rust");
  });

  it("exposes company and tag options with counts", () => {
    const articles = ref([
      makeArticle({ source: "meta", tags: ["infra"] }),
      makeArticle({ source: "meta", tags: ["infra", "ml"] }),
    ]);
    const { companies, tags } = useArticleFilter(articles);
    expect(companies.value).toEqual([{ id: "meta", count: 2 }]);
    expect(tags.value[0]).toEqual({ tag: "infra", count: 2 });
  });

  it("initializes state from the URL", () => {
    history.replaceState(null, "", "/?q=k8s&companies=uber");
    const { state } = useArticleFilter(ref<Article[]>([]));
    expect(state.query).toBe("k8s");
    expect(state.companies).toEqual(["uber"]);
  });

  it("writes state changes back to the URL", async () => {
    const { state } = useArticleFilter(ref<Article[]>([]));
    state.query = "wasm";
    state.companies = ["meta"];
    await nextTick();
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("wasm");
    expect(params.get("companies")).toBe("meta");
  });

  it("clears the query string when state returns to defaults", async () => {
    history.replaceState(null, "", "/?q=k8s");
    const { state } = useArticleFilter(ref<Article[]>([]));
    state.query = "";
    await nextTick();
    expect(window.location.search).toBe("");
  });
});
