<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Article } from "../types.js";
import ArticleCard from "./ArticleCard.vue";

const props = withDefaults(
  defineProps<{
    articles: Article[];
    bookmarkedIds?: string[];
    pendingIds?: string[];
    emptyTitle?: string;
    emptyText?: string;
    showClearButton?: boolean;
  }>(),
  {
    bookmarkedIds: () => [],
    pendingIds: () => [],
    emptyTitle: "No articles found",
    emptyText: "No articles match your filters.",
    showClearButton: false,
  },
);

const emit = defineEmits<{ toggleBookmark: [id: string]; clearFilters: [] }>();

const INITIAL_VISIBLE = 20;
const LOAD_INCREMENT = 40;
const visibleCount = ref(INITIAL_VISIBLE);

watch(
  () => props.articles,
  () => {
    visibleCount.value = INITIAL_VISIBLE;
  },
);

const bookmarkedSet = computed(() => new Set(props.bookmarkedIds));
const pendingSet = computed(() => new Set(props.pendingIds));
const visible = computed(() => props.articles.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < props.articles.length);
</script>

<template>
  <div class="article-list-wrap">
    <div v-if="articles.length === 0" class="empty">
      <div class="empty-title">{{ emptyTitle }}</div>
      <div>{{ emptyText }}</div>
      <button v-if="showClearButton" class="empty-clear" @click="emit('clearFilters')">
        Clear all filters
      </button>
    </div>
    <template v-else>
      <div class="article-list">
        <ArticleCard
          v-for="article in visible"
          :key="article.id"
          :article="article"
          :bookmarked="bookmarkedSet.has(article.id)"
          :pending="pendingSet.has(article.id)"
          @toggle-bookmark="emit('toggleBookmark', $event)"
        />
      </div>
      <div v-if="hasMore" class="load-more-wrap">
        <button class="load-more" @click="visibleCount += LOAD_INCREMENT">
          Load {{ LOAD_INCREMENT }} more
        </button>
        <span class="showing-label">
          Showing {{ visible.length.toLocaleString("en-US") }} of
          {{ articles.length.toLocaleString("en-US") }}
        </span>
      </div>
    </template>
  </div>
</template>
