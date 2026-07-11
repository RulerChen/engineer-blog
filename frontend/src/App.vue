<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ArticleList from "./components/ArticleList.vue";
import FilterPanel from "./components/FilterPanel.vue";
import SearchBar from "./components/SearchBar.vue";
import { useArticleFilter } from "./composables/useArticleFilter.js";
import { useBookmarks } from "./composables/useBookmarks.js";
import { useTheme } from "./composables/useTheme.js";
import type { Article } from "./types.js";

const articles = ref<Article[]>([]);
const loading = ref(true);
const loadError = ref(false);
const viewSaved = ref(false);

const { state, filtered, companies, tags } = useArticleFilter(articles);
const { theme, toggleTheme } = useTheme();
const { bookmarks, toggleBookmark } = useBookmarks();

const stats = computed(() => {
  if (articles.value.length === 0) return "";
  const lastUpdated = articles.value.reduce(
    (max, a) => (a.fetchedAt > max ? a.fetchedAt : max),
    articles.value[0].fetchedAt,
  );
  const date = new Date(lastUpdated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${articles.value.length} articles · ${companies.value.length} sources · updated ${date}`;
});

const shown = computed(() =>
  viewSaved.value ? filtered.value.filter((a) => bookmarks.value.includes(a.id)) : filtered.value,
);

const countLabel = computed(
  () =>
    `${shown.value.length.toLocaleString("en-US")} ${shown.value.length === 1 ? "article" : "articles"}`,
);

const savedTabLabel = computed(
  () => `Saved${bookmarks.value.length ? ` · ${bookmarks.value.length}` : ""}`,
);

const emptyTitle = computed(() =>
  viewSaved.value && bookmarks.value.length === 0 ? "No saved articles yet" : "No articles found",
);
const emptyText = computed(() =>
  viewSaved.value && bookmarks.value.length === 0
    ? "Tap the bookmark on any article to keep it here for later."
    : "No articles match your filters. Try widening the date range or removing a filter.",
);

function clearFilters(): void {
  state.query = "";
  state.companies = [];
  state.tags = [];
  state.datePreset = "all";
  state.dateFrom = null;
  state.dateTo = null;
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
        <button
          class="theme-toggle"
          :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          {{ theme === "dark" ? "☀" : "☾" }}
        </button>
      </div>
    </header>

    <p v-if="loading" class="loading">Loading articles…</p>
    <p v-else-if="loadError" class="error">Could not load articles. Try refreshing.</p>
    <div v-else class="layout">
      <SearchBar v-model="state.query" />
      <FilterPanel :state="state" :companies="companies" :tags="tags" />

      <div class="tabs-row">
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
        <span class="count-label">{{ countLabel }} · newest first</span>
      </div>

      <ArticleList
        :articles="shown"
        :bookmarked-ids="bookmarks"
        :empty-title="emptyTitle"
        :empty-text="emptyText"
        :show-clear-button="!viewSaved"
        @toggle-bookmark="toggleBookmark"
        @clear-filters="clearFilters"
      />

      <footer class="site-footer">
        Aggregated from each company's public engineering blog
        <span v-if="stats">· {{ stats }}</span>
      </footer>
    </div>
  </div>
</template>
