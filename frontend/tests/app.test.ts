import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import type { Article } from "../src/types.js";

const articles: Article[] = [
  {
    id: "id-1",
    title: "Streaming at scale",
    url: "https://example.com/streaming",
    source: "netflix",
    publishedAt: "2026-07-10T00:00:00.000Z",
    tags: ["streaming"],
    summary: "How we stream.",
    thumbnail: null,
    fetchedAt: "2026-07-11T00:00:00.000Z",
  },
  {
    id: "id-2",
    title: "Feed ranking",
    url: "https://example.com/ranking",
    source: "meta",
    publishedAt: "2026-07-09T00:00:00.000Z",
    tags: ["ml"],
    summary: "Ranking systems.",
    thumbnail: null,
    fetchedAt: "2026-07-01T00:00:00.000Z",
  },
];

beforeEach(() => {
  history.replaceState(null, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(articles), { status: 200 })),
  );
});

describe("App", () => {
  it("loads articles and renders the stats line and list", async () => {
    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.text()).toContain("Engineer Blog Aggregator");
    expect(wrapper.text()).toContain("2 articles");
    expect(wrapper.text()).toContain("2 sources");
    expect(wrapper.text()).toContain("Streaming at scale");
    expect(wrapper.text()).toContain("Feed ranking");
  });

  it("shows an error state when the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const wrapper = mount(App);
    await flushPromises();
    expect(wrapper.find(".error").exists()).toBe(true);
  });
});
