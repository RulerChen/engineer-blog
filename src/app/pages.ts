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

/** Switches in place rather than loading the other file; the query belongs to the page that set it, so it is dropped. */
export function openPage(page: Page): void {
  if (page === currentPage.value) return;
  history.pushState(null, "", PAGES[page].path);
  show(page);
}

window.addEventListener("popstate", () => show(pageAt(window.location.pathname)));
