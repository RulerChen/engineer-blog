import { ref } from "vue";

/** Which page is on screen; a tab switch is state, not a page load, though both paths are real files. */
export type Corpus = "articles" | "roadmaps";

const BASE = import.meta.env.BASE_URL;
const ROADMAPS_PATH = `${BASE}roadmap/`;

const PATHS: Record<Corpus, string> = {
  articles: BASE,
  roadmaps: ROADMAPS_PATH,
};
/** Kept in step with the <title> each entry document ships with. */
const TITLES: Record<Corpus, string> = {
  articles: "Awesome Engineering Blogs",
  roadmaps: "Awesome Engineering Roadmaps",
};

/** Trailing slash optional, because a typed URL usually is not. */
function read(path: string): Corpus {
  const at = (dir: string): boolean => path === dir || path === dir.slice(0, -1);
  if (at(ROADMAPS_PATH)) return "roadmaps";
  return "articles";
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
