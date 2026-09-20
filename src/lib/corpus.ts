import { ref } from "vue";

/**
 * Which of the two lists is on screen. It is state, not a page load: the switch
 * in the header is a tab, and a tab that costs a round trip and a fresh parse of
 * the other corpus is a tab in name only.
 *
 * The path still changes, and both paths are still real files in dist/. That is
 * the part worth keeping — /paper/ can be linked, bookmarked and crawled, and a
 * cold load of it answers 200 with the papers page rather than a 404 the app
 * patches up afterwards. What goes away is only the navigation between them.
 */
export type Corpus = "articles" | "papers";

const BASE = import.meta.env.BASE_URL;
const PAPERS_PATH = `${BASE}paper/`;

const PATHS: Record<Corpus, string> = { articles: BASE, papers: PAPERS_PATH };
/** Kept in step with the <title> each entry document ships with. */
const TITLES: Record<Corpus, string> = {
  articles: "Awesome Engineering Blogs",
  papers: "Awesome Engineering Papers",
};

/** Trailing slash optional, because a typed URL usually is not. */
function read(path: string): Corpus {
  return path === PAPERS_PATH || path === PAPERS_PATH.slice(0, -1) ? "papers" : "articles";
}

export const corpus = ref<Corpus>(read(window.location.pathname));

export function openCorpus(next: Corpus): void {
  if (next === corpus.value) return;
  // The query belongs to the corpus that set it, so it is dropped, not carried.
  history.pushState(null, "", PATHS[next]);
  document.title = TITLES[next];
  corpus.value = next;
  window.scrollTo({ top: 0 });
}

window.addEventListener("popstate", () => {
  corpus.value = read(window.location.pathname);
  document.title = TITLES[corpus.value];
});
