<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ArticleList from "./components/ArticleList.vue";
import EntryForm from "./components/EntryForm.vue";
import FilterPanel from "./components/FilterPanel.vue";
import SearchBar from "./components/SearchBar.vue";
import { useArticleFilter } from "./composables/useArticleFilter.js";
import { useBookmarks } from "./composables/useBookmarks.js";
import { useTheme } from "./composables/useTheme.js";
import type { EntryInput } from "./lib/entry.js";
import { topTags } from "./lib/filter.js";
import { sourceName } from "./lib/sources.js";
import { normalizeUrl } from "./lib/url.js";
import type { Article } from "./types.js";

const articles = ref<Article[]>([]);
const loading = ref(true);
const loadError = ref(false);
const viewSaved = ref(false);
const showForm = ref(false);

/**
 * Entries committed in this session. The site serves a static articles.json, so
 * a fresh commit only shows up after the deploy rebuilds — these are held in
 * memory and flagged in the list until then.
 */
const pending = ref<Article[]>([]);

/** Newest published first — the list's only ordering, pending entries included. */
const all = computed(() =>
  [...pending.value, ...articles.value].toSorted(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  ),
);
const { state, filtered, companies, tags } = useArticleFilter(all);
const { theme, toggleTheme } = useTheme();
const { bookmarks, toggleBookmark } = useBookmarks();

const pendingIds = computed(() => pending.value.map((a) => a.id));
const knownSources = computed(() =>
  [...new Set(all.value.map((a) => a.source).filter(Boolean))].toSorted((a, b) =>
    sourceName(a).localeCompare(sourceName(b)),
  ),
);
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
const knownTags = computed(() => topTags(all.value, Infinity).map((t) => t.tag));

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

const shown = computed(() =>
  viewSaved.value ? filtered.value.filter((a) => bookmarks.value.includes(a.id)) : filtered.value,
);

const countLabel = computed(
  () =>
    `${shown.value.length.toLocaleString("en-US")} ${shown.value.length === 1 ? "entry" : "entries"}`,
);

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
  state.datePreset = "all";
  state.dateFrom = null;
  state.dateTo = null;
}

/** Mirror the build script's mapping so a just-committed entry renders like the real thing. */
function onAdded(entry: EntryInput): void {
  const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(entry.publishedAt)
    ? `${entry.publishedAt}T00:00:00.000Z`
    : entry.publishedAt;
  pending.value = [
    {
      id: `pending:${entry.url}`,
      title: entry.title,
      url: entry.url,
      source: entry.source ?? "",
      publishedAt,
      tags: entry.tags ?? [],
    },
    ...pending.value,
  ];
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
        :pending-ids="pendingIds"
        :empty-title="emptyTitle"
        :empty-text="emptyText"
        :show-clear-button="!viewSaved && all.length > 0"
        @toggle-bookmark="toggleBookmark"
        @clear-filters="clearFilters"
      />

      <footer class="site-footer">
        A hand-curated reading list of engineering writing
        <span v-if="stats">· {{ stats }}</span>
      </footer>
    </div>

    <EntryForm
      v-if="showForm"
      :known-sources="knownSources"
      :known-tags="knownTags"
      :existing-urls="existingUrls"
      @close="showForm = false"
      @added="onAdded"
    />
  </div>
</template>
