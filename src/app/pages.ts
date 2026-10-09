import { ref } from "vue";
import { PAGE_TITLES, ROADMAP_PATH, topicPath } from "../shared/site.js";

export type Page = "blog" | "roadmap";

const BASE = import.meta.env.BASE_URL;

export const PAGES: Record<Page, { path: string; title: string }> = {
  blog: { path: BASE, title: PAGE_TITLES.blog },
  roadmap: { path: `${BASE}${ROADMAP_PATH}`, title: PAGE_TITLES.roadmap },
};

export function topicUrl(id: string): string {
  return `${BASE}${topicPath(id)}`;
}

/** Trailing slash optional, because a typed URL usually lacks it. */
function pageAt(pathname: string): Page {
  const roadmap = PAGES.roadmap.path;
  return pathname.startsWith(roadmap) || pathname === roadmap.slice(0, -1) ? "roadmap" : "blog";
}

/** The topic in /roadmap/<id>/, or null on the topic map. */
export function topicInUrl(): string | null {
  const { pathname } = window.location;
  const roadmap = PAGES.roadmap.path;
  return pathname.startsWith(roadmap) ? pathname.slice(roadmap.length).split("/")[0] || null : null;
}

// Topics used to be a ?topic= query; links from then still open the topic.
const legacyTopic = new URLSearchParams(window.location.search).get("topic");
if (legacyTopic && pageAt(window.location.pathname) === "roadmap")
  history.replaceState(null, "", topicUrl(legacyTopic));

export const currentPage = ref<Page>(pageAt(window.location.pathname));
// The dev server answers every path with index.html, whose title is the blog's.
document.title = PAGES[currentPage.value].title;

function show(page: Page): void {
  currentPage.value = page;
  document.title = PAGES[page].title;
}

/** Each page's url as it was left, so coming back through the tabs finds the same filters or topic. */
const leftUrl: Record<Page, string> = { blog: PAGES.blog.path, roadmap: PAGES.roadmap.path };

const here = (): string => window.location.pathname + window.location.search;

/** Switches in place rather than loading the other file; the url belongs to the page that set it, so it waits for that page. */
export function openPage(page: Page): void {
  if (page === currentPage.value) return;
  leftUrl[currentPage.value] = here();
  history.pushState(null, "", leftUrl[page]);
  show(page);
}

/** Pushed, then announced as a popstate, which both pages already answer by re-reading the url. */
function navigate(page: Page, url: string): void {
  if (page !== currentPage.value) leftUrl[currentPage.value] = here();
  history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Straight to one roadmap topic from either page. */
export function openTopic(id: string): void {
  navigate("roadmap", topicUrl(id));
}

/** The blog list narrowed to a text search, keeping whatever other filters it had. */
export function searchList(text: string): void {
  const query = new URLSearchParams(
    currentPage.value === "blog"
      ? window.location.search
      : new URL(leftUrl.blog, window.location.origin).search,
  );
  query.set("q", text);
  navigate("blog", `${PAGES.blog.path}?${query}`);
}

window.addEventListener("popstate", () => show(pageAt(window.location.pathname)));
