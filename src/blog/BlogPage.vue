<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "../app/Icon.vue";
import { ICONS } from "../app/icons.js";
import ArticleList from "./ArticleList.vue";
import FilterBar from "./FilterBar.vue";
import SearchBar from "./SearchBar.vue";
import { useArticles } from "./data.js";
import { resetFilter, toggled } from "./filter.js";
import { buildSeriesIndex, seriesLabel } from "./series.js";
import { stateToQuery } from "./urlState.js";
import { useArticleFilter } from "./useArticleFilter.js";
import { type EntryState, useEntryState } from "./useEntryState.js";

const { data: articles, loading, failed } = useArticles();
const { state, filtered, companies, tags } = useArticleFilter(articles);
const { states, toggle } = useEntryState();

/** Ignored is a list of its own, never mixed back into All, and the standing way back to anything dismissed. */
type View = "all" | EntryState;
const view = ref<View>("all");
/** The marks whose toggle takes a card out of this tab: only an ignore in All, either one elsewhere. */
const removes = computed<EntryState[]>(() =>
  view.value === "all" ? ["hidden"] : ["saved", "hidden"],
);

const TABS: {
  view: View;
  label: string;
  icon?: { paths: string[]; filled?: boolean; strokeWidth: number };
}[] = [
  { view: "all", label: "All" },
  { view: "saved", label: "Saved", icon: { paths: ICONS.bookmark, filled: true, strokeWidth: 0 } },
  { view: "hidden", label: "Ignored", icon: { paths: ICONS.eyeOff, strokeWidth: 2.4 } },
];

const seriesIndex = computed(() => buildSeriesIndex(articles.value));
/** A URL can name a series the index dropped, which still needs a label. */
const activeSeriesLabel = computed(() =>
  state.series ? (seriesIndex.value.get(state.series)?.label ?? seriesLabel(state.series)) : null,
);

/** The list is newest first, so the last entry dates the far end of the date picker. */
const earliestYear = computed(() => {
  const oldest = articles.value.at(-1);
  return oldest ? Number(oldest.publishedAt.slice(0, 4)) : new Date().getFullYear();
});

const shown = computed(() => {
  const list = filtered.value.filter((article) => {
    const mark = states.value[article.id];
    return view.value === "all" ? mark !== "hidden" : mark === view.value;
  });
  // Narrowed to one series, the list is read start to finish, so oldest first.
  return state.series ? list.toReversed() : list;
});

const EMPTY_VIEW: Record<EntryState, { title: string; text: string }> = {
  saved: {
    title: "No saved entries yet",
    text: "Tap the bookmark on any entry to keep it here for later.",
  },
  hidden: {
    title: "Nothing ignored",
    text: "Dismiss an entry and it lands here, out of the main list until you put it back.",
  },
};

const empty = computed(() => {
  if (view.value !== "all" && !Object.values(states.value).includes(view.value)) {
    return EMPTY_VIEW[view.value];
  }
  if (articles.value.length === 0) {
    return {
      title: "Nothing here yet",
      text: "The reading list is built from the files in data/ — none loaded.",
    };
  }
  return {
    title: "No entries found",
    text: "No entries match your filters. Try widening the date range or removing a filter.",
  };
});

function selectSeries(id: string): void {
  state.series = id;
  view.value = "all";
  window.scrollTo({ top: 0 });
}

/** Toggles like the topic menu; adding jumps up, since the list under the pointer is replaced and there is nothing to scroll past. */
function selectTag(tag: string): void {
  const adding = !state.tags.includes(tag);
  state.tags = toggled(state.tags, tag);
  if (adding) window.scrollTo({ top: 0 });
}
</script>

<template>
  <div>
    <p v-if="loading" class="loading">Loading entries…</p>
    <p v-else-if="failed" class="error">Could not load entries. Try refreshing.</p>
    <div v-else class="layout">
      <SearchBar v-model="state.query" />
      <FilterBar
        :state="state"
        :companies="companies"
        :tags="tags"
        :min-year="earliestYear"
        :series-label="activeSeriesLabel"
      >
        <template #end>
          <div
            class="tabs segmented"
            :style="{
              '--count': TABS.length,
              '--index': TABS.findIndex((tab) => tab.view === view),
            }"
          >
            <!-- Icon-only past All, so the tabs fit the filter row; the tooltip names them. -->
            <button
              v-for="tab in TABS"
              :key="tab.view"
              class="tab-button"
              :class="{ active: view === tab.view }"
              :aria-label="tab.icon ? tab.label : undefined"
              :data-tip="tab.icon ? tab.label : undefined"
              @click="view = tab.view"
            >
              <Icon v-if="tab.icon" v-bind="tab.icon" :size="14" />
              <span v-else>{{ tab.label }}</span>
            </button>
          </div>
        </template>
      </FilterBar>

      <div v-if="shown.length === 0" class="empty">
        <div class="empty-title">{{ empty.title }}</div>
        <div>{{ empty.text }}</div>
        <button
          v-if="view === 'all' && articles.length > 0"
          class="empty-clear"
          @click="resetFilter(state)"
        >
          Clear all filters
        </button>
      </div>
      <ArticleList
        v-else
        :articles="shown"
        :reset-key="`${view}?${stateToQuery(state)}`"
        :series-index="seriesIndex"
        :states="states"
        :active-tags="state.tags"
        :removes="removes"
        @toggle-saved="toggle($event, 'saved')"
        @toggle-hidden="toggle($event, 'hidden')"
        @select-series="selectSeries"
        @select-tag="selectTag"
      />
    </div>
  </div>
</template>
