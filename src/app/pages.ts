import { ref } from "vue";

export type Page = "blog" | "roadmap";

const BASE = import.meta.env.BASE_URL;

/** Both paths are real files because GitHub Pages serves static files only; titles match each index.html. */
export const PAGES: Record<Page, { path: string; title: string }> = {
  blog: { path: BASE, title: "Awesome Engineering Blogs" },
  roadmap: { path: `${BASE}roadmap/`, title: "Awesome Engineering Roadmaps" },
};

/** Trailing slash optional, because a typed URL usually lacks it. */
function pageAt(pathname: string): Page {
  const roadmap = PAGES.roadmap.path;
  return pathname === roadmap || pathname === roadmap.slice(0, -1) ? "roadmap" : "blog";
}

export const currentPage = ref<Page>(pageAt(window.location.pathname));

function show(page: Page): void {
  currentPage.value = page;
  document.title = PAGES[page].title;
}

/** Switches in place rather than loading the other file; the query belongs to the page that set it, so it is dropped. */
export function openPage(page: Page): void {
  if (page === currentPage.value) return;
  history.pushState(null, "", PAGES[page].path);
  show(page);
  window.scrollTo({ top: 0 });
}

window.addEventListener("popstate", () => show(pageAt(window.location.pathname)));
