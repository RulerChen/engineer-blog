import { ref } from "vue";
import { PAGE_TITLES, ROADMAP_PATH } from "../shared/site.js";

export type Page = "blog" | "roadmap";

const BASE = import.meta.env.BASE_URL;

export const PAGES: Record<Page, { path: string; title: string }> = {
  blog: { path: BASE, title: PAGE_TITLES.blog },
  roadmap: { path: `${BASE}${ROADMAP_PATH}`, title: PAGE_TITLES.roadmap },
};

/** Trailing slash optional, because a typed URL usually lacks it. */
function pageAt(pathname: string): Page {
  const roadmap = PAGES.roadmap.path;
  return pathname === roadmap || pathname === roadmap.slice(0, -1) ? "roadmap" : "blog";
}

export const currentPage = ref<Page>(pageAt(window.location.pathname));
// The dev server answers every path with index.html, whose title is the blog's.
document.title = PAGES[currentPage.value].title;

function show(page: Page): void {
  currentPage.value = page;
  document.title = PAGES[page].title;
}

/** Each page's query as it was left, so coming back through the tabs finds the same filters or topic. */
const leftQuery: Record<Page, string> = { blog: "", roadmap: "" };

/** Switches in place rather than loading the other file; the query belongs to the page that set it, so it waits for that page. */
export function openPage(page: Page): void {
  if (page === currentPage.value) return;
  leftQuery[currentPage.value] = window.location.search;
  history.pushState(null, "", PAGES[page].path + leftQuery[page]);
  show(page);
}

/** Pushed, then announced as a popstate, which both pages already answer by re-reading the url. */
function navigate(page: Page, query: string): void {
  if (page !== currentPage.value) leftQuery[currentPage.value] = window.location.search;
  history.pushState(null, "", PAGES[page].path + query);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Straight to one roadmap topic from either page. */
export function openTopic(id: string): void {
  navigate("roadmap", `?topic=${encodeURIComponent(id)}`);
}

/** The blog list narrowed to a text search, keeping whatever other filters it had. */
export function searchList(text: string): void {
  const query = new URLSearchParams(
    currentPage.value === "blog" ? window.location.search : leftQuery.blog,
  );
  query.set("q", text);
  navigate("blog", `?${query}`);
}

window.addEventListener("popstate", () => show(pageAt(window.location.pathname)));
