import { computed, onScopeDispose, reactive, watch, type ComputedRef, type Ref } from "vue";
import { currentPage } from "../app/pages.js";
import type { Article } from "../shared/entry.js";
import { type Count, type FilterState, applyFilters, companyCounts, tagCounts } from "./filter.js";
import { queryToState, stateToQuery } from "./urlState.js";

/** Browsers throttle a burst of history calls, so the URL waits for typing to pause; the list does not. */
const URL_DELAY_MS = 200;

export interface ArticleFilter {
  state: FilterState;
  filtered: ComputedRef<Article[]>;
  companies: ComputedRef<Count[]>;
  tags: ComputedRef<Count[]>;
}

/** Search and filters over the full list, mirrored into the URL query so a filtered view can be shared. */
export function useArticleFilter(articles: Ref<Article[]>): ArticleFilter {
  const state = reactive<FilterState>(queryToState(window.location.search));

  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(state, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // The page may have switched while this waited, and the query is not the other page's.
      if (currentPage.value !== "blog") return;
      const query = stateToQuery(state);
      history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    }, URL_DELAY_MS);
  });
  onScopeDispose(() => clearTimeout(timer));

  // Back, forward and the palette's "show all in the list" push urls; the bar's own edits only replace them.
  const onPopState = (): void => {
    if (currentPage.value === "blog") Object.assign(state, queryToState(window.location.search));
  };
  window.addEventListener("popstate", onPopState);
  onScopeDispose(() => window.removeEventListener("popstate", onPopState));

  return {
    state,
    filtered: computed(() => applyFilters(articles.value, state)),
    companies: computed(() => companyCounts(articles.value)),
    tags: computed(() => tagCounts(articles.value)),
  };
}
