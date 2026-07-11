import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ArticleList from "../src/components/ArticleList.vue";
import type { Article } from "../src/types.js";

function makeArticle(n: number, overrides: Partial<Article> = {}): Article {
  return {
    id: `id-${n}`,
    title: `Post number ${n}`,
    url: `https://example.com/${n}`,
    source: "meta",
    publishedAt: "2026-07-10T00:00:00.000Z",
    tags: ["infra"],
    summary: `Summary ${n}`,
    thumbnail: null,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("ArticleList", () => {
  it("renders cards from sample data", () => {
    const wrapper = mount(ArticleList, {
      props: { articles: [makeArticle(1), makeArticle(2)] },
    });
    expect(wrapper.text()).toContain("Post number 1");
    expect(wrapper.text()).toContain("Post number 2");
    expect(wrapper.text()).toContain("Meta"); // company badge
    const link = wrapper.find("a.title-link");
    expect(link.attributes("href")).toBe("https://example.com/1");
    expect(link.attributes("target")).toBe("_blank");
  });

  it("paginates with Load more (20 initial, +40 per load)", async () => {
    const articles = Array.from({ length: 70 }, (_v, i) => makeArticle(i));
    const wrapper = mount(ArticleList, { props: { articles } });
    expect(wrapper.findAll(".article-card")).toHaveLength(20);
    await wrapper.find("button.load-more").trigger("click");
    expect(wrapper.findAll(".article-card")).toHaveLength(60);
    await wrapper.find("button.load-more").trigger("click");
    expect(wrapper.findAll(".article-card")).toHaveLength(70);
    expect(wrapper.find("button.load-more").exists()).toBe(false);
  });

  it("shows an empty state when there are no matches", () => {
    const wrapper = mount(ArticleList, { props: { articles: [] } });
    expect(wrapper.find(".empty").text()).toContain("No articles match");
  });

  it("resets pagination when the article set changes", async () => {
    const articles = Array.from({ length: 70 }, (_v, i) => makeArticle(i));
    const wrapper = mount(ArticleList, { props: { articles } });
    await wrapper.find("button.load-more").trigger("click");
    await wrapper.setProps({ articles: articles.slice(0, 50) });
    expect(wrapper.findAll(".article-card")).toHaveLength(20);
  });
});
