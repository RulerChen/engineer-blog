import { computed, reactive, watch, type ComputedRef, type Ref } from "vue";
import type { Article } from "../shared/entry.js";
import { type Count, type FilterState, applyFilters, companyCounts, tagCounts } from "./filter.js";
import { queryToState, stateToQuery } from "./urlState.js";

export interface ArticleFilter {
  state: FilterState;
  filtered: ComputedRef<Article[]>;
  companies: ComputedRef<Count[]>;
  tags: ComputedRef<Count[]>;
}

/** Search and filters over the full list, mirrored into the URL query so a filtered view can be shared. */
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
    tags: computed(() => tagCounts(articles.value)),
  };
}
