<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ArticleList from "./components/ArticleList.vue";
import FilterPanel from "./components/FilterPanel.vue";
import SearchBar from "./components/SearchBar.vue";
import { useArticleFilter } from "./composables/useArticleFilter.js";
import { useEntryState } from "./composables/useEntryState.js";
import { useTheme } from "./composables/useTheme.js";
import { buildSeriesIndex } from "./lib/series.js";
import type { Article } from "./types.js";

const articles = ref<Article[]>([]);
const loading = ref(true);
const loadError = ref(false);
/**
 * Which of the three lists is on screen. Ignored is a destination like the other
 * two rather than an overlay on All: an ignored entry is never mixed back into
 * the main list, and the tab is a standing way back to anything dismissed.
 */
type View = "all" | "saved" | "ignored";
const view = ref<View>("all");

/** Newest published first — the list's only ordering. */
const all = computed(() =>
  articles.value.toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
);
const { state, filtered, companies, tags } = useArticleFilter(all);
const { theme, toggleTheme } = useTheme();
const { savedIds, hiddenIds, toggleSaved, toggleHidden } = useEntryState();

/**
 * Built from every entry, not the filtered view, so a card still says "Part 2 of
 * 4" while a company or tag filter is hiding the other three.
 */
const seriesIndex = computed(() => buildSeriesIndex(all.value));

/** `all` is newest-first, so the last entry dates the far end of the date picker. */
const earliestYear = computed(() => {
  const oldest = all.value.at(-1);
  return oldest ? Number(oldest.publishedAt.slice(0, 4)) : new Date().getFullYear();
});

const savedSet = computed(() => new Set(savedIds.value));
const hiddenSet = computed(() => new Set(hiddenIds.value));

const shown = computed(() => {
  const list = filtered.value.filter((a) => {
    if (view.value === "saved") return savedSet.value.has(a.id);
    if (view.value === "ignored") return hiddenSet.value.has(a.id);
    return !hiddenSet.value.has(a.id);
  });
  // Narrowed to one series, newest-first is backwards: it is a reading list now.
  return state.series ? list.toReversed() : list;
});

const emptyTitle = computed(() => {
  if (view.value === "saved" && savedIds.value.length === 0) return "No saved entries yet";
  if (view.value === "ignored" && hiddenIds.value.length === 0) return "Nothing ignored";
  if (all.value.length === 0) return "Nothing here yet";
  return "No entries found";
});
const emptyText = computed(() => {
  if (view.value === "saved" && savedIds.value.length === 0) {
    return "Tap the bookmark on any entry to keep it here for later.";
  }
  if (view.value === "ignored" && hiddenIds.value.length === 0) {
    return "Dismiss an entry and it lands here, out of the main list until you put it back.";
  }
  if (all.value.length === 0) {
    return "The reading list is built from the files in data/ — none loaded.";
  }
  return "No entries match your filters. Try widening the date range or removing a filter.";
});

function clearFilters(): void {
  state.query = "";
  state.companies = [];
  state.tags = [];
  state.series = null;
  state.datePreset = "all";
  state.dateFrom = null;
  state.dateTo = null;
}

/** Reading one series start to finish — from a card's series row. */
function selectSeries(id: string): void {
  state.series = id;
  view.value = "all";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Filtering by a tag off a card's chip. A toggle, exactly like the filter
 * panel's own list — clicking the chip that is already filtering removes it,
 * which is the only way back out from the card. Adding one scrolls up, because
 * the list under the pointer is about to be a different one; removing one does
 * not, so the entry you were reading stays where it is.
 */
function selectTag(tag: string): void {
  if (state.tags.includes(tag)) {
    state.tags = state.tags.filter((t) => t !== tag);
    return;
  }
  state.tags = [...state.tags, tag];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}articles.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    articles.value = (await res.json()) as Article[];
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container">
    <header class="site-header">
      <div class="header-inner">
        <div class="logo-mark heading-font">E</div>
        <h1 class="heading-font">Engineer Blog Aggregator</h1>
        <div class="header-spacer"></div>
        <span v-if="all.length" class="header-count" data-tip="Total entries" data-tip-pos="bottom"
          >{{ all.length.toLocaleString("en-US") }} entries</span
        >
        <button
          class="theme-toggle"
          data-tip-pos="bottom"
          data-tip-align="right"
          :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :data-tip="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          {{ theme === "dark" ? "☀" : "☾" }}
        </button>
      </div>
    </header>

    <p v-if="loading" class="loading">Loading entries…</p>
    <p v-else-if="loadError" class="error">Could not load entries. Try refreshing.</p>
    <div v-else class="layout">
      <SearchBar v-model="state.query" />
      <FilterPanel :state="state" :companies="companies" :tags="tags" :min-year="earliestYear">
        <template #end>
          <div class="tabs">
            <button class="tab-button" :class="{ active: view === 'all' }" @click="view = 'all'">
              All
            </button>
            <button
              class="tab-button"
              :class="{ active: view === 'saved' }"
              @click="view = 'saved'"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none">
                <path d="M6 3.5h12v17l-6-4.2-6 4.2z"></path>
              </svg>
              <span>Saved</span>
            </button>
            <button
              class="tab-button"
              :class="{ active: view === 'ignored' }"
              @click="view = 'ignored'"
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 4l16 16"></path>
                <path
                  d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1"
                ></path>
                <path d="M6.4 7.8A16.8 16.8 0 0 0 2 12s3.5 6.5 10 6.5a9.9 9.9 0 0 0 4-.8"></path>
                <path d="M9.9 10.1a2.9 2.9 0 0 0 4 4"></path>
              </svg>
              <span>Ignored</span>
            </button>
          </div>
        </template>
      </FilterPanel>

      <ArticleList
        :articles="shown"
        :series-index="seriesIndex"
        :bookmarked-ids="savedIds"
        :hidden-ids="hiddenIds"
        :active-tags="state.tags"
        :empty-title="emptyTitle"
        :empty-text="emptyText"
        :show-clear-button="view === 'all' && all.length > 0"
        @toggle-bookmark="toggleSaved"
        @toggle-hidden="toggleHidden"
        @clear-filters="clearFilters"
        @select-series="selectSeries"
        @select-tag="selectTag"
      />
    </div>
  </div>
</template>
