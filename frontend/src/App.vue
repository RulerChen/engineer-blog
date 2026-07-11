<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ArticleList from "./components/ArticleList.vue";
import FilterPanel from "./components/FilterPanel.vue";
import SearchBar from "./components/SearchBar.vue";
import { useArticleFilter } from "./composables/useArticleFilter.js";
import type { Article } from "./types.js";

const articles = ref<Article[]>([]);
const loading = ref(true);
const loadError = ref(false);

const { state, filtered, companies, tags } = useArticleFilter(articles);

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
      <h1>Engineer Blog Aggregator</h1>
      <p class="stats">{{ stats }}</p>
    </header>

    <p v-if="loading" class="loading">Loading articles…</p>
    <p v-else-if="loadError" class="error">Could not load articles. Try refreshing.</p>
    <div v-else class="layout">
      <FilterPanel :state="state" :companies="companies" :tags="tags" />
      <main>
        <SearchBar v-model="state.query" />
        <ArticleList :articles="filtered" />
      </main>
    </div>
  </div>
</template>
