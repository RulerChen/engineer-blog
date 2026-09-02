<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ArticleList from "./components/ArticleList.vue";
import EntryForm from "./components/EntryForm.vue";
import FilterPanel from "./components/FilterPanel.vue";
import SearchBar from "./components/SearchBar.vue";
import { useArticleFilter } from "./composables/useArticleFilter.js";
import { useBookmarks } from "./composables/useBookmarks.js";
import { useTheme } from "./composables/useTheme.js";
import { tagCounts } from "./lib/filter.js";
import { buildSeriesIndex, knownSeries } from "./lib/series.js";
import { normalizeUrl } from "./lib/url.js";
import type { Article } from "./types.js";

const articles = ref<Article[]>([]);
const loading = ref(true);
const loadError = ref(false);
const viewSaved = ref(false);
const showForm = ref(false);

/** Newest published first — the list's only ordering. */
const all = computed(() =>
  articles.value.toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
);
const { state, filtered, companies, tags } = useArticleFilter(all);
const { theme, toggleTheme } = useTheme();
const { bookmarks, toggleBookmark } = useBookmarks();

/**
 * Built from every entry, not the filtered view, so a card still says "Part 2 of
 * 4" while a company or tag filter is hiding the other three.
 */
const seriesIndex = computed(() => buildSeriesIndex(all.value));

const existingUrls = computed(() =>
  all.value.flatMap((a) => {
    try {
      return [normalizeUrl(a.url)];
    } catch {
      return [];
    }
  }),
);
/** Every tag already in use, most-used first, so the form suggests real ones. */
const knownTags = computed(() => tagCounts(all.value).map((t) => t.tag));
/** Same idea for series: only slugs already in the data, so parts actually meet up. */
const knownSeriesIds = computed(() => knownSeries(all.value));

const stats = computed(() => {
  if (all.value.length === 0) return "";
  const latest = all.value.reduce(
    (max, a) => (a.publishedAt > max ? a.publishedAt : max),
    all.value[0].publishedAt,
  );
  const date = new Date(latest).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${all.value.length} entries · latest ${date}`;
});

const shown = computed(() => {
  const list = viewSaved.value
    ? filtered.value.filter((a) => bookmarks.value.includes(a.id))
    : filtered.value;
  // Narrowed to one series, newest-first is backwards: it is a reading list now.
  return state.series ? list.toReversed() : list;
});

const savedTabLabel = computed(
  () => `Saved${bookmarks.value.length ? ` · ${bookmarks.value.length}` : ""}`,
);

const emptyTitle = computed(() => {
  if (viewSaved.value && bookmarks.value.length === 0) return "No saved entries yet";
  if (all.value.length === 0) return "Nothing here yet";
  return "No entries found";
});
const emptyText = computed(() => {
  if (viewSaved.value && bookmarks.value.length === 0) {
    return "Tap the bookmark on any entry to keep it here for later.";
  }
  if (all.value.length === 0) {
    return "Add the first entry with the + button up top.";
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
  viewSaved.value = false;
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
        <button class="add-button" title="Add an entry" @click="showForm = true">
          <span class="add-plus">+</span>
          <span class="add-text">Add</span>
        </button>
        <button
          class="theme-toggle"
          :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
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
      <FilterPanel :state="state" :companies="companies" :tags="tags">
        <template #end>
          <div class="tabs">
            <button class="tab-button" :class="{ active: !viewSaved }" @click="viewSaved = false">
              All
            </button>
            <button class="tab-button" :class="{ active: viewSaved }" @click="viewSaved = true">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none">
                <path d="M6 3.5h12v17l-6-4.2-6 4.2z"></path>
              </svg>
              <span>{{ savedTabLabel }}</span>
            </button>
          </div>
        </template>
      </FilterPanel>

      <ArticleList
        :articles="shown"
        :series-index="seriesIndex"
        :bookmarked-ids="bookmarks"
        :active-tags="state.tags"
        :empty-title="emptyTitle"
        :empty-text="emptyText"
        :show-clear-button="!viewSaved && all.length > 0"
        @toggle-bookmark="toggleBookmark"
        @clear-filters="clearFilters"
        @select-series="selectSeries"
        @select-tag="selectTag"
      />

      <footer class="site-footer">
        A hand-curated reading list of engineering writing
        <span v-if="stats">· {{ stats }}</span>
      </footer>
    </div>

    <EntryForm
      v-if="showForm"
      :known-tags="knownTags"
      :known-series="knownSeriesIds"
      :existing-urls="existingUrls"
      @close="showForm = false"
    />
  </div>
</template>
