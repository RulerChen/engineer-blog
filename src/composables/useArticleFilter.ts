import { computed, reactive, watch, type ComputedRef, type Ref } from "vue";
import { applyFilters, companyCounts, topTags, type FilterState } from "../lib/filter.js";
import { queryToState, stateToQuery } from "../lib/urlState.js";
import type { Article } from "../types.js";

export interface ArticleFilter {
  state: FilterState;
  filtered: ComputedRef<Article[]>;
  companies: ComputedRef<{ id: string; count: number }[]>;
  tags: ComputedRef<{ tag: string; count: number }[]>;
}

/** Search + filters over the full dataset, kept in sync with the URL query string. */
export function useArticleFilter(articles: Ref<Article[]>): ArticleFilter {
  const state = reactive<FilterState>(queryToState(window.location.search));

  watch(state, () => {
    const query = stateToQuery(state);
    history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  });

  return {
    state,
    filtered: computed(() => applyFilters(articles.value, state)),
    companies: computed(() => companyCounts(articles.value)),
    tags: computed(() => topTags(articles.value)),
  };
}
